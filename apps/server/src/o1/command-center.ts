import type { Store } from "../db.ts";

export class O1CommandCenterService {
  constructor(private readonly db: Store) {}

  async snapshot(owner: string) {
    const [missions, agents, computers, routines, approvals, audit] = await Promise.all([
      this.db.list<Record<string, unknown>>(owner, "o1-missions"),
      this.db.list<Record<string, unknown>>(owner, "o1-agents"),
      this.db.list<Record<string, unknown>>(owner, "o1-computers"),
      this.db.list<Record<string, unknown>>(owner, "o1-routines"),
      this.db.list<Record<string, unknown>>(owner, "o1-connector-actions"),
      this.db.list<Record<string, unknown>>(owner, "o1-audit"),
    ]);
    const activeMissions = missions.filter((item) => ["queued","running","waiting_input","waiting_approval","verifying","recovering"].includes(String(item.status)));
    const activeAgents = agents.filter((item) => ["working","waiting","verifying","blocked"].includes(String(item.status)));
    const pendingApprovals = approvals.filter((item) => item.status === "awaiting_review");
    const activeComputers = computers.filter((item) => !["stopped","terminated","destroyed"].includes(String(item.status)));
    const enabledRoutines = routines.filter((item) => item.enabled === true);
    return {
      counts: { missions: missions.length, activeMissions: activeMissions.length, agents: agents.length, activeAgents: activeAgents.length, computers: computers.length, activeComputers: activeComputers.length, routines: routines.length, enabledRoutines: enabledRoutines.length, pendingApprovals: pendingApprovals.length, auditEvents: audit.length },
      activeMissions, activeAgents, activeComputers, enabledRoutines, pendingApprovals: pendingApprovals.map((item) => ({ id: item.id, operation: item.operation, status: item.status, createdAt: item.createdAt, expiresAt: item.expiresAt })), recentAudit: audit.slice(0, 30),
      generatedAt: new Date().toISOString(),
    };
  }
}