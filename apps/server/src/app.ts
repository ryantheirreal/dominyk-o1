import { randomUUID } from "node:crypto";
import { MessageSchema } from "@ag-ui/core";
import { CopilotKitIntelligence } from "@copilotkit/runtime/v2";
import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { cors } from "hono/cors";
import { z } from "zod";
import { emailDraftSchema, proposalSchema } from "../../../packages/domain/src/index.ts";
import { ActionService } from "./actions.ts";
import { agentConfigured, makeRuntime } from "./agent.ts";
import { createAuth } from "./auth.ts";
import { BrowserService } from "./browser.ts";
import { ComputerService, type DockerRunner } from "./computer.ts";
import { computerRoutes } from "./computer-routes.ts";
import { assertApiDeploymentConfig, type Config } from "./config.ts";
import type { Store } from "./db.ts";
import { agentRoutes } from "./engine/routes.ts";
import { AgentService } from "./engine/service.ts";
import { AppError } from "./errors.ts";
import { Files } from "./files.ts";
import { GoogleAuth } from "./google-auth.ts";
import { WorkspaceService } from "./workspace.ts";
import { createO1Platform } from "./o1/index.ts";
import { ImessageConnector } from "./o1/connectors/imessage.ts";
import { ConnectorBus } from "./o1/connector-bus.ts";
import { ConnectorActionService } from "./o1/connector-actions.ts";
import { evaluatePermissionMode, modeLabel, type PermissionMode, normalizePermissionMode } from "./o1/permissions.ts";
import { O1_PLANS } from "../../../packages/domain/src/plans.ts";
import { O1EntitlementService } from "./o1/entitlements.ts";
import { O1MissionStore } from "./o1/mission-store.ts";
import { O1ComputerSessionService } from "./o1/computer-sessions.ts";
import { routeModel } from "./o1/model-router.ts";
import { O1RunPreferencesService } from "./o1/run-preferences.ts";
import { O1AuditLedger } from "./o1/audit-ledger.ts";
import { O1AgentRegistry } from "./o1/agent-registry.ts";
import { O1HandoffService } from "./o1/agent-handoff.ts";
import { classifyFailure, decideRecovery } from "./o1/recovery-engine.ts";
import { O1RoutineService } from "./o1/routines.ts";

export async function createApp(
  db: Store,
  config: Config,
  options: { docker?: DockerRunner } = {},
) {
  assertApiDeploymentConfig(config);
  const audit = new O1AuditLedger(db);
  const agentRegistry = new O1AgentRegistry(db, audit);
  const handoffs = new O1HandoffService(db, audit);
  const routines = new O1RoutineService(db, audit);
  const auth = await createAuth(db, config, audit),
    files = new Files(db, config, auth),
    google = new GoogleAuth(db, config),
    workspace = new WorkspaceService(db, config, files, google);
  const actions = new ActionService(db, {
    execute: (owner, input, connectionId, targetVersion) =>
      workspace.execute(owner, input, connectionId, targetVersion),
    prepare: (owner, input, connectionId) => workspace.prepare(owner, input, connectionId),
    connected: (owner) => workspace.connected(owner),
    connection: (owner) => workspace.connection(owner),
  });
  const browser = new BrowserService(db, config, auth, files);
  const computer = new ComputerService(db, config, options.docker);
  const agent = new AgentService(db, config, workspace, files, actions, browser, computer);
  const intelligence = new CopilotKitIntelligence({ apiKey: config.intelligenceApiKey });
  const runtime = makeRuntime(config, agent, auth, intelligence);
  const o1 = await createO1Platform(config);
  const connectorBus = new ConnectorBus();
  const connectorActions = new ConnectorActionService(db, connectorBus, Date.now, audit);
  const entitlements = new O1EntitlementService(db);
  const missions = new O1MissionStore(db, undefined, audit);
  const computers = new O1ComputerSessionService(db, o1.computerFabric?.persistentProvider, o1.computerFabric?.persistentGateway, config.computerProvisioningEnabled === true, audit);
  const runPreferences = new O1RunPreferencesService(db, entitlements, audit);
  async function requireComputerPermission(owner: string, risk: "write" | "destructive") {
    const settings = await db.get<{ mode?: string }>(owner, "o1-settings", "permissions");
    const decision = evaluatePermissionMode(normalizePermissionMode(settings?.mode), risk);
    if (decision.decision !== "allow")
      throw new AppError("Computer action requires approval in the current O1 permission mode", 409);
  }

  const app = new Hono<{ Variables: { owner: string } }>();
  const origins = new Set([...config.allowedOrigins, new URL(config.publicUrl).origin]);
  app.use("*", async (c, next) => {
    const origin = c.req.header("origin");
    if (origin && !origins.has(origin)) return c.json({ error: "Origin is not allowed" }, 403);
    c.header("X-Content-Type-Options", "nosniff");
    c.header("Referrer-Policy", "no-referrer");
    c.header("Cache-Control", "no-store");
    await next();
  });
  app.use(
    "*",
    cors({
      origin: (origin) => (origins.has(origin) ? origin : undefined),
      allowHeaders: ["Content-Type", "Authorization"],
      allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      credentials: true,
    }),
  );
  app.use(
    "*",
    bodyLimit({
      maxSize: 12 * 1024 * 1024,
      onError: (c) => c.json({ error: "Request is too large; PDFs must be 10 MB or smaller" }, 413),
    }),
  );
  app.onError((error, c) => {
    if (error instanceof z.ZodError)
      return c.json({ error: error.issues.map((i) => i.message).join("; ") }, 422);
    if (error instanceof AppError) return c.json({ error: error.message }, error.status);
    if (error.name === "PdfError" || error.name === "RecurringEventError")
      return c.json({ error: error.message }, 422);
    if (error instanceof SyntaxError) return c.json({ error: "Invalid request data" }, 400);
    // Provider and document errors are useful, but raw stack traces and token-bearing responses are not.
    console.error(`[O1] ${error.name}`);
    return c.json(
      {
        error:
          error.name === "PdfError" || error.name === "GoogleApiError"
            ? error.message
            : "Request failed. Check the server setup and try again.",
      },
      502,
    );
  });
  // O1 routes are declared before the general /api middleware below; protect them explicitly here.
  app.use("/api/o1", async (c, next) => {
    const owner = await auth.owner(c.req.header("authorization"));
    c.set("owner", owner);
    await next();
  });
  app.use("/api/o1/*", async (c, next) => {
    const owner = await auth.owner(c.req.header("authorization"));
    c.set("owner", owner);
    await next();
  });
  app.get("/api/health", (c) =>
    c.json({
      ok: true,
      mode: config.mode,
      agentConfigured: agentConfigured(config),
      browserConfigured: Boolean(config.workerUrl && config.workerToken),
    }),
  );
  let loginWindow = 0,
    loginAttempts = 0;
  app.post("/api/session", async (c) => {
    if (Date.now() - loginWindow > 60000) {
      loginWindow = Date.now();
      loginAttempts = 0;
    }
    if (++loginAttempts > 30)
      throw new AppError("Too many sign-in attempts. Try again in a minute.", 429);
    const body = z.object({ accessKey: z.string().optional() }).parse(await c.req.json());
    const session = await auth.session(body.accessKey);
    await workspace.ensureSample(session.owner, actions);
    await agent.ensure(session.owner);
    if (config.mode === "sample") await agent.refreshIdeas(session.owner);
    return c.json(session);
  });
  app.get("/api/o1", async (c) => {
    const statuses = await o1.connectorStatuses();
    return c.json({
      name: o1.name,
      version: o1.version,
      architecture: o1.architecture,
      capabilities: o1.capabilitySummary(),
      connectors: statuses,
      computer: { kind: o1.computerFabric?.kind ?? "unconfigured", persistentProvider: Boolean(o1.computerFabric?.persistentProvider), persistentGateway: Boolean(o1.computerFabric?.persistentGateway), browserGateway: Boolean(o1.computerFabric?.browserGateway), openAIComputerUse: Boolean(o1.computerUseClient) },
    });
  });
  app.get("/api/o1/capabilities", (c) => c.json({
    ...o1.capabilitySummary(),
    definitions: o1.capabilities,
  }));
  app.get("/api/o1/connectors", async (c) => c.json(await o1.connectorStatuses()));
  app.get("/api/o1/plans", (c) => c.json({ plans: O1_PLANS }));
  app.get("/api/o1/model-catalog", (c) => c.json({ models: o1.modelCatalog() }));
  app.get("/api/o1/entitlements", async (c) => c.json(await entitlements.get(c.get("owner"))));
  app.get("/api/o1/audit", async (c) => { const limit = z.coerce.number().int().min(1).max(500).default(200).parse(c.req.query("limit")); return c.json(await audit.list(c.get("owner"), limit)); });
  app.get("/api/o1/agents", async (c) => c.json(await agentRegistry.list(c.get("owner"))));
  app.get("/api/o1/handoffs", async (c) => c.json(await handoffs.list(c.get("owner"))));
  app.post("/api/o1/handoffs", async (c) => {
    const body = z.object({ id: z.string().min(1).max(128), source: z.string().min(1).max(128), target: z.discriminatedUnion("type", [z.object({ type: z.literal("agent"), agentId: z.string().min(1).max(128) }), z.object({ type: z.literal("human"), reason: z.string().min(1).max(2000) })]), missionId: z.string().min(1).max(128), summary: z.string().min(1).max(4000), state: z.record(z.string(), z.unknown()).optional() }).parse(await c.req.json());
    return c.json(await handoffs.create(c.get("owner"), body), 201);
  });
  app.post("/api/o1/handoffs/:id/transition", async (c) => {
    const body = z.object({ status: z.enum(["accepted","returned","cancelled"]) }).parse(await c.req.json());
    return c.json(await handoffs.transition(c.get("owner"), c.req.param("id"), body.status));
  });
  app.post("/api/o1/recovery/decide", (c) => {
    const body = z.object({ message: z.string().min(1).max(4000) }).parse(c.req.query());
    const failure = classifyFailure(new Error(body.message));
    return c.json({ failure, decision: decideRecovery(failure) });
  });
  app.post("/api/o1/agents", async (c) => {
    const body = z.object({ id: z.string().min(1).max(128).optional(), name: z.string().trim().min(1).max(120), role: z.string().trim().min(1).max(120), objective: z.string().trim().min(1).max(4000), modelPolicy: z.string().max(512).optional(), memoryScope: z.string().max(128).optional(), toolScopes: z.array(z.string().max(128)).max(100).optional() }).parse(await c.req.json());
    return c.json(await agentRegistry.create(c.get("owner"), body), 201);
  });
  app.post("/api/o1/agents/:id/status", async (c) => {
    const body = z.object({ status: z.enum(["idle","working","waiting","verifying","blocked","recovered","completed"]) }).parse(await c.req.json());
    return c.json(await agentRegistry.setStatus(c.get("owner"), c.req.param("id"), body.status));
  });
  app.get("/api/o1/routines", async (c) => c.json(await routines.list(c.get("owner"))));
  app.post("/api/o1/routines", async (c) => {
    const body = z.object({ id: z.string().min(1).max(128), name: z.string().trim().min(1).max(120), goal: z.string().trim().min(1).max(4000), planId: z.enum(["mini","agent-pro-plus","max-20x"]), trigger: z.discriminatedUnion("type", [z.object({ type: z.literal("schedule"), cron: z.string().min(1).max(120) }), z.object({ type: z.literal("webhook"), key: z.string().min(1).max(256) }), z.object({ type: z.literal("event"), source: z.string().min(1).max(128), event: z.string().min(1).max(256) })]) }).parse(await c.req.json());
    return c.json(await routines.create(c.get("owner"), body), 201);
  });
  app.post("/api/o1/routines/:id/enabled", async (c) => {
    const body = z.object({ enabled: z.boolean() }).parse(await c.req.json());
    return c.json(await routines.setEnabled(c.get("owner"), c.req.param("id"), body.enabled));
  });
  app.get("/api/o1/run-preferences", async (c) => c.json(await runPreferences.get(c.get("owner"))));
  app.put("/api/o1/run-preferences", async (c) => {
    const body = z.object({ effort: z.number().int().min(1).max(3), modelId: z.string().min(1).max(128) }).parse(await c.req.json());
    return c.json(await runPreferences.set(c.get("owner"), body));
  });
  app.post("/api/o1/model-route", async (c) => {
    const body = z.object({ effort: z.number().int().min(1).max(3), modelId: z.string().min(1).max(128).optional() }).parse(await c.req.json());
    const entitlement = await entitlements.get(c.get("owner"));
    const route = routeModel({ planId: entitlement.plan.id, effort: body.effort, modelId: body.modelId });
    await audit.record({ owner: c.get("owner"), category: "model", action: "routed", targetId: route.modelId, data: route });
    return c.json(route);
  });
  app.get("/api/o1/missions", async (c) => c.json(await missions.list(c.get("owner"))));
  app.get("/api/o1/computers", async (c) => c.json(await computers.list(c.get("owner"))));
  app.post("/api/o1/computers", async (c) => {
    const body = z.object({ name: z.string().trim().min(1).max(63), image: z.string().trim().max(128).optional(), region: z.string().trim().max(64).optional(), size: z.string().trim().max(64).optional() }).parse(await c.req.json());
    await requireComputerPermission(c.get("owner"), "write");
    return c.json(await computers.create(c.get("owner"), body), 201);
  });
  app.get("/api/o1/computers/:id", async (c) => c.json(await computers.get(c.get("owner"), c.req.param("id"))));
  app.post("/api/o1/computers/:id/sync", async (c) => c.json(await computers.sync(c.get("owner"), c.req.param("id"))));
  app.post("/api/o1/computers/:id/start", async (c) => { await requireComputerPermission(c.get("owner"), "write"); return c.json(await computers.start(c.get("owner"), c.req.param("id"))); });
  app.post("/api/o1/computers/:id/stop", async (c) => { await requireComputerPermission(c.get("owner"), "write"); return c.json(await computers.stop(c.get("owner"), c.req.param("id"))); });
  app.post("/api/o1/computers/:id/observe", async (c) => c.json(await computers.observe(c.get("owner"), c.req.param("id"))));
  app.post("/api/o1/computers/:id/action", async (c) => {
    await requireComputerPermission(c.get("owner"), "write");
    const body = z.object({
      operationId: z.string().trim().min(1).max(120),
      action: z.discriminatedUnion("type", [
        z.object({ type: z.literal("click"), x: z.number().finite(), y: z.number().finite(), button: z.enum(["left","right","wheel","back","forward"]).optional() }),
        z.object({ type: z.literal("double_click"), x: z.number().finite(), y: z.number().finite() }),
        z.object({ type: z.literal("type"), text: z.string().max(20000) }),
        z.object({ type: z.literal("key"), key: z.string().min(1).max(64) }),
        z.object({ type: z.literal("keypress"), keys: z.array(z.string().min(1).max(64)).min(1).max(8) }),
        z.object({ type: z.literal("scroll"), x: z.number().finite().optional(), y: z.number().finite().optional(), deltaX: z.number().finite().min(-5000).max(5000), deltaY: z.number().finite().min(-5000).max(5000) }),
        z.object({ type: z.literal("move"), x: z.number().finite(), y: z.number().finite() }),
        z.object({ type: z.literal("drag"), path: z.array(z.object({ x: z.number().finite(), y: z.number().finite() })).min(2).max(100) }),
        z.object({ type: z.literal("wait") }),
        z.object({ type: z.literal("navigate"), url: z.url().max(4096) }),
        z.object({ type: z.literal("shell"), command: z.string().trim().min(1).max(16000), cwd: z.string().max(2048).optional() }),
      ]),
    }).parse(await c.req.json());    return c.json(await computers.act(c.get("owner"), c.req.param("id"), body.operationId, body.action));
  });
  app.delete("/api/o1/computers/:id", async (c) => { await requireComputerPermission(c.get("owner"), "destructive"); return c.json(await computers.destroy(c.get("owner"), c.req.param("id"))); });
  app.get("/api/o1/missions/:id", async (c) => {
    const mission = await missions.get(c.get("owner"), c.req.param("id"));
    if (!mission) throw new AppError("Mission not found", 404);
    return c.json(mission);
  });
  app.post("/api/o1/missions", async (c) => {
    const body = z.object({ id: z.string().min(1).max(128).optional(), goal: z.string().trim().min(1).max(10000), budget: z.object({ maxSteps: z.number().int().positive().optional(), maxCost: z.number().nonnegative().optional(), maxRuntimeMs: z.number().int().positive().optional() }).optional() }).parse(await c.req.json());
    return c.json(await missions.create(c.get("owner"), body), 201);
  });
  app.post("/api/o1/missions/:id/transition", async (c) => {
    const body = z.object({ status: z.enum(["planned","queued","running","waiting_input","waiting_approval","verifying","succeeded","failed","cancelled","recovering","unknown_outcome"]) }).parse(await c.req.json());
    return c.json(await missions.transition(c.get("owner"), c.req.param("id"), body.status));
  });
  app.post("/api/o1/missions/:id/checkpoint", async (c) => {
    const body = z.object({ phaseIndex: z.number().int().min(0).optional(), completedSteps: z.number().int().min(0).optional(), estimatedCost: z.number().nonnegative().optional() }).parse(await c.req.json());
    return c.json(await missions.checkpoint(c.get("owner"), c.req.param("id"), body));
  });
  app.get("/api/o1/connectors/:id/health", async (c) => {
    const id = c.req.param("id");
    if (!o1.connector(id)) throw new AppError("Connector not found", 404);
    const statuses = await o1.connectorStatuses();
    return c.json(statuses.find((item) => item.id === id));
  });
  app.post("/api/o1/policy/authorize", async (c) => {
    const body = z.object({
      actorId: z.string().min(1).max(256),
      tool: z.string().min(1).max(256),
      risk: z.enum(["read","write","sensitive","external","destructive"]),
      target: z.string().max(2048).optional(),
      explicitApproval: z.boolean().optional(),
      dryRun: z.boolean().optional(),
    }).parse(await c.req.json());
    return c.json(o1.authorizeTool(body));
  });
  app.post("/api/o1/missions/plan", async (c) => {
    const body = z.object({
      id: z.string().min(1).max(128),
      goal: z.string().min(1).max(10000),
      capabilities: z.array(z.string().min(1)).min(1).max(35),
      qualityScore: z.number().min(0).max(1).optional(),
      budget: z.object({
        maxSteps: z.number().int().positive().optional(),
        maxCost: z.number().nonnegative().optional(),
        maxRuntimeMs: z.number().int().positive().optional(),
      }).optional(),
    }).parse(await c.req.json());
    return c.json(o1.buildMission(body), 201);
  });
  app.post("/api/o1/imessage/send", async (c) => {
    const body = z.object({
      chatId: z.string().min(1).max(1024),
      text: z.string().max(10000).default(""),
      attachmentB64: z.string().max(12_000_000).optional(),
      attachmentName: z.string().max(255).optional(),
    }).parse(await c.req.json());
    if (!body.text && !body.attachmentB64)
      throw new AppError("Text or an image attachment is required", 422);
    const action = await connectorActions.propose(c.get("owner"), "imessage.send", {
      chatId: body.chatId,
      text: body.text,
      ...(body.attachmentB64 ? { attachmentB64: body.attachmentB64, attachmentName: body.attachmentName ?? "image" } : {}),
    });
    return c.json({ approvalRequired: action.status === "awaiting_review", action }, 201);
  });
  app.get("/api/o1/permissions", async (c) => {
    const current = await db.get<any>(c.get("owner"), "o1-settings", "permissions");
    const value = current ? { ...current, mode: normalizePermissionMode(typeof current?.mode === "string" ? current.mode : undefined) } : { id:"permissions", mode:"ask_o1", updatedAt:new Date(0).toISOString() };
    return c.json(value);
  });
  app.put("/api/o1/permissions", async (c) => {
    const body = z.object({
      mode: z.enum(["ask_o1","ask_approval","approve_for_me"]),
      confirm: z.boolean().default(false),
    }).parse(await c.req.json());
    if (body.mode === "approve_for_me" && !body.confirm)
      throw new AppError("Explicit confirmation is required", 409);
    const value = {
      id:"permissions",
      mode:body.mode as PermissionMode,
      label:modeLabel(body.mode as PermissionMode),
      updatedAt:new Date().toISOString(),
    };
    await db.put(c.get("owner"),"o1-settings",value);
    await audit.record({ owner: c.get("owner"), category: "permission", action: "changed", targetId: "permissions", data: { mode: value.mode, confirmed: body.mode === "approve_for_me" } });
    return c.json(value);
  });
  app.get("/api/o1/connector-actions", async (c) => {
    return c.json(await connectorActions.list(c.get("owner")));
  });
  app.post("/api/o1/connector-actions", async (c) => {
    const body = z.object({
      operation: z.enum([
        "slack.send_message","telegram.send_message","discord.send_message","imessage.send",
      ]),
      payload: z.record(z.string(), z.unknown()),
    }).parse(await c.req.json());
    return c.json(await connectorActions.propose(c.get("owner"), body.operation, body.payload), 201);
  });
  app.post("/api/o1/connector-actions/:id/decide", async (c) => {
    const body = z.object({
      hash: z.string().length(64),
      decision: z.enum(["approve","deny"]),
    }).parse(await c.req.json());
    return c.json(await connectorActions.decide(c.get("owner"),c.req.param("id"),body.hash,body.decision));
  });
  app.get("/api/o1/imessage/messages", async (c) => {
    const after = c.req.query("after");
    if (after !== undefined && (!/^\\d+$/.test(after) || Number(after) > Number.MAX_SAFE_INTEGER))
      throw new AppError("after must be a valid unix timestamp in milliseconds", 422);
    return c.json(await new ImessageConnector().messages(after === undefined ? undefined : Number(after)));
  });
  app.get("/api/google/callback", async (c) => {
    if (c.req.query("error"))
      return c.html("<h1>Google connection cancelled</h1><p>You can return to O1.</p>", 400);
    const state = c.req.query("state"),
      code = c.req.query("code");
    if (!state || !code) throw new AppError("Google callback is incomplete");
    await google.callback(state, code);
    return c.html(
      "<h1>Google is connected</h1><p>Return to O1 and refresh your workspace.</p>",
    );
  });
  app.use("/api/*", async (c, next) => {
    const signedRoute =
      /^\/api\/files\/[^/]+\/content$|^\/api\/browsers\/[^/]+\/(?:preview|console)$/.test(
        c.req.path,
      );
    const owner =
      signedRoute && c.req.query("signature")
        ? auth.verify(new URL(c.req.url))
        : await auth.owner(c.req.header("authorization"));
    c.set("owner", owner);
    await next();
  });
  app.get("/api/workspace", async (c) => {
    const [snapshot, reachable] = await Promise.all([
      workspace.snapshot(c.get("owner"), c.req.query("q")),
      browser.reachable(),
    ]);
    snapshot.browsers = snapshot.browsers.map((s) => browser.decorate(c.get("owner"), s));
    // A configured worker that does not answer is offline, not ready.
    snapshot.connections = snapshot.connections.map((connection) =>
      connection.id === "browser" && connection.status === "connected" && !reachable
        ? { ...connection, status: "unavailable" }
        : connection,
    );
    return c.json(snapshot);
  });
  app.route("/api/agent", agentRoutes(agent));
  app.route("/api/computer", computerRoutes(computer, files));
  app.get("/api/calendars", async (c) => c.json(await workspace.calendars(c.get("owner"))));
  app.get("/api/calendar/events", async (c) => {
    const query = z
      .object({
        calendarId: z.string().min(1).max(1024).optional(),
        timeMin: z.iso.datetime({ offset: true }).optional(),
        timeMax: z.iso.datetime({ offset: true }).optional(),
      })
      .parse(c.req.query());
    if (
      query.timeMin &&
      query.timeMax &&
      (Date.parse(query.timeMax) <= Date.parse(query.timeMin) ||
        Date.parse(query.timeMax) - Date.parse(query.timeMin) > 366 * 86400000)
    )
      throw new AppError("Choose a calendar range between one moment and 366 days", 422);
    return c.json(await workspace.events(c.get("owner"), query));
  });
  app.get("/api/mail/threads/:id", async (c) =>
    c.json(await workspace.thread(c.get("owner"), c.req.param("id"))),
  );
  app.post("/api/actions", async (c) => {
    const input = proposalSchema.parse(await c.req.json());
    if (input.kind === "email.send")
      for (const id of input.data.attachmentIds) await files.get(c.get("owner"), id);
    return c.json(await actions.propose(c.get("owner"), input), 201);
  });
  app.post("/api/actions/:id/decide", async (c) => {
    const body = z
      .object({ hash: z.string(), decision: z.enum(["approve", "deny"]) })
      .parse(await c.req.json());
    return c.json(
      await actions.decide(c.get("owner"), c.req.param("id"), body.hash, body.decision),
    );
  });
  app.get("/api/drafts", async (c) => c.json(await db.list(c.get("owner"), "drafts")));
  app.post("/api/drafts", async (c) => {
    const body = emailDraftSchema.extend({ id: z.string().optional() }).parse(await c.req.json());
    const existing = body.id
      ? await db.get<{ createdAt: string }>(c.get("owner"), "drafts", body.id)
      : null;
    if (body.id && !existing) throw new AppError("Draft not found", 404);
    return c.json(
      await db.put(c.get("owner"), "drafts", {
        ...body,
        id: body.id ?? randomUUID(),
        createdAt: existing?.createdAt ?? new Date().toISOString(),
      }),
      201,
    );
  });
  app.get("/api/main-thread", async (c) => {
    const owner = c.get("owner");
    await db.insertIfAbsent(owner, "conversation-settings", {
      id: "main",
      threadId: randomUUID(),
      existing: false,
    });
    const main = await db.get<{ threadId: string }>(owner, "conversation-settings", "main");
    if (!main) throw new AppError("Main conversation could not be loaded", 503);
    try {
      await intelligence.getOrCreateThread({
        threadId: main.threadId,
        userId: owner,
        agentId: "default",
      });
    } catch {
      throw new AppError(
        "Main conversation is unavailable. Check the Rich Threads connection and try again.",
        502,
      );
    }
    return c.json({ threadId: main.threadId, existing: true });
  });
  app.get("/api/conversation", async (c) =>
    c.json((await db.get(c.get("owner"), "conversations", "default")) ?? { messages: [] }),
  );
  app.put("/api/conversation", async (c) => {
    const body = await c.req.json();
    const messages = z.array(z.unknown()).max(1000).parse(body.messages);
    for (const message of messages) MessageSchema.parse(message);
    await db.put(c.get("owner"), "conversations", { id: "default", messages });
    return c.json({ ok: true });
  });
  app.post("/api/files", async (c) => {
    const data = await c.req.parseBody();
    const file = data.file;
    if (!(file instanceof File)) throw new AppError("Choose a PDF file");
    return c.json(
      await files.import(
        c.get("owner"),
        file.name,
        new Uint8Array(await file.arrayBuffer()),
        "Uploaded by you",
      ),
      201,
    );
  });
  app.get("/api/files/:id/content", async (c) => {
    const file = await files.get(c.get("owner"), c.req.param("id"));
    c.header("Content-Type", "application/pdf");
    c.header("Content-Disposition", `inline; filename*=UTF-8''${encodeURIComponent(file.name)}`);
    return c.body(await files.bytes(c.get("owner"), file.id));
  });
  app.post("/api/files/:id/fill", async (c) => {
    const body = z
      .object({ fields: z.record(z.string(), z.union([z.string(), z.boolean()])) })
      .parse(await c.req.json());
    return c.json(await files.fill(c.get("owner"), c.req.param("id"), body.fields), 201);
  });
  app.post("/api/mail/import-attachment", async (c) => {
    const body = z.object({ reference: z.string() }).parse(await c.req.json());
    return c.json(await workspace.importAttachment(c.get("owner"), body.reference), 201);
  });
  app.post("/api/google/connect", async (c) => {
    const body = z.object({ capability: z.enum(["read", "write"]) }).parse(await c.req.json());
    if (config.mode === "sample") {
      await db.put(c.get("owner"), "settings", {
        id: "google",
        enabled: true,
        connectionId: randomUUID(),
      });
      return c.json({ url: null, connected: true });
    }
    return c.json(await google.connect(c.get("owner"), body.capability === "write"));
  });
  app.post("/api/google/disconnect", async (c) => {
    if (config.mode === "sample")
      await db.put(c.get("owner"), "settings", { id: "google", enabled: false });
    else await google.disconnect(c.get("owner"));
    return c.json({ ok: true });
  });
  app.post("/api/browsers", async (c) => {
    const body = z.object({ url: z.url().max(4096) }).parse(await c.req.json());
    return c.json(await browser.create(c.get("owner"), body.url), 201);
  });
  app.get("/api/browsers/:id", async (c) => {
    const owner = c.get("owner");
    return c.json(browser.decorate(owner, await browser.get(owner, c.req.param("id"))));
  });
  app.post("/api/browsers/:id/navigate", async (c) => {
    const body = z.object({ url: z.url().max(4096) }).parse(await c.req.json());
    return c.json(await browser.navigate(c.get("owner"), c.req.param("id"), body.url));
  });
  app.post("/api/browsers/:id/close", async (c) =>
    c.json(await browser.close(c.get("owner"), c.req.param("id"))),
  );
  app.get("/api/browsers/:id/read", async (c) =>
    c.json(await browser.read(c.get("owner"), c.req.param("id"))),
  );
  app.post("/api/browsers/:id/reopen", async (c) => {
    const raw = await c.req.text();
    const body = z.object({ url: z.url().max(4096).optional() }).parse(raw ? JSON.parse(raw) : {});
    return c.json(await browser.reopen(c.get("owner"), c.req.param("id"), body.url));
  });
  app.post("/api/browsers/:id/import-downloads", async (c) =>
    c.json(await browser.imports(c.get("owner"), c.req.param("id"))),
  );
  app.get("/api/browsers/:id/preview", async (c) => {
    const response = await browser.preview(c.get("owner"), c.req.param("id"));
    c.header("Content-Type", "image/png");
    return c.body(await response.arrayBuffer());
  });
  app.get("/api/browsers/:id/console", async (c) => {
    await browser.get(c.get("owner"), c.req.param("id"));
    c.header(
      "Content-Security-Policy",
      "default-src 'self'; img-src 'self' blob:; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'self'",
    );
    return c.html(browser.console(c.get("owner"), c.req.param("id")));
  });
  app.post("/api/browsers/:id/console", async (c) => {
    await browser.input(c.get("owner"), c.req.param("id"), await c.req.json());
    return c.json({ ok: true });
  });
  app.all("/api/copilotkit/*", async (c) => {
    if (!agentConfigured(config))
      throw new AppError(
        "Configure a model and provider API key, or a valid AG-UI endpoint, to start chat",
        503,
      );
    const response = await runtime.fetch(c.req.raw);
    // Runtime 1.70 emits SSE strings; a WHATWG Response body requires byte chunks.
    const encoder = new TextEncoder();
    const body = response.body?.pipeThrough(
      new TransformStream({
        transform(chunk, controller) {
          controller.enqueue(typeof chunk === "string" ? encoder.encode(chunk) : chunk);
        },
      }),
    );
    return new Response(body, { status: response.status, headers: response.headers });
  });
  app.get("/", (c) =>
    c.json({ name: "O1", app: "http://localhost:8081", health: "/api/health", platform: "/api/o1" }),
  );
  return { app, auth, files, actions, workspace, agent, computer };
}
