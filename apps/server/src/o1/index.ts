import type { Config } from "../config.ts";
import { capabilitySummary, O1_CAPABILITIES } from "./capabilities.ts";
import { connectorStatuses, CONNECTORS, connector } from "./connectors.ts";
import { authorizeTool, buildExecutionStages, buildMission, modelRoute, requiresVerification } from "./runtime.ts";
import { redactSecrets } from "./policy.ts";
import { modelCatalog } from "./model-catalog.ts";
import { OpenAIResponsesComputerClient } from "./openai-computer-client.ts";
export { MissionGovernor, canTransition } from "./mission-governor.ts";
export { createComputerFabric } from "./computer-fabric.ts";
export { routeModel } from "./model-router.ts";

export async function createO1Platform(config?: Config) {
  const computerFabric = config ? createComputerFabric(config) : undefined;
  const computerUseClient = config?.openAiApiKey ? new OpenAIResponsesComputerClient(config.openAiApiKey, config.computerUseModel ?? "gpt-5.6-sol") : undefined;
  return {
    name:"O1",
    version:"0.3.0",
    architecture:"O1 agent runtime + persistent experience + governed computer fabric",
    capabilities:O1_CAPABILITIES,
    capabilitySummary,
    connectors:CONNECTORS,
    connector,
    connectorStatuses,
    authorizeTool,
    buildMission,
    buildExecutionStages,
    requiresVerification,
    modelRoute,
    routeModel,
    modelCatalog,
    computerFabric,
    computerUseClient,
    redactSecrets,
  };
}

export { O1AgentRegistry } from "./agent-registry.ts";
export { O1HandoffService } from "./agent-handoff.ts";
export { classifyFailure, decideRecovery } from "./recovery-engine.ts";
export { O1RoutineService } from "./routines.ts";
export { validateTaskGraph, readyTaskBatches } from "./task-graph.ts";
export { executeComputerBatch } from "./computer-batch.ts";
export { executeParallelTasks } from "./parallel-executor.ts";
export { parseOpenAIComputerCall } from "./openai-computer-call.ts";
export { O1AuditLedger } from "./audit-ledger.ts";
export { O1EntitlementService } from "./entitlements.ts";
export { O1MissionStore } from "./mission-store.ts";
export { O1RunPreferencesService } from "./run-preferences.ts";