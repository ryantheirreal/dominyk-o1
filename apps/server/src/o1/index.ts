import { capabilitySummary, O1_CAPABILITIES } from "./capabilities.ts";
import { connectorStatuses, CONNECTORS, connector } from "./connectors.ts";
import { authorizeTool, buildExecutionStages, buildMission, modelRoute, requiresVerification } from "./runtime.ts";
import { redactSecrets } from "./policy.ts";
export { MissionGovernor, canTransition } from "./mission-governor.ts";
export { createComputerFabric } from "./computer-fabric.ts";
export { routeModel } from "./model-router.ts";

export async function createO1Platform() {
  return {
    name:"O1",
    version:"0.2.0",
    architecture:"OpenBot core + OpenMuse experience + O1 runtime",
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
    redactSecrets,
  };
}
