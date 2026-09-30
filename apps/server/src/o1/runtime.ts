import { evaluatePolicy, type O1Decision, type O1Risk } from "./policy.ts";
import { expandCapability, specialistAgents, type SpecialistAgent } from "./capabilities.ts";

export interface MissionIntent {
  id: string;
  goal: string;
  capabilities: string[];
  qualityScore?: number;
  budget?: { maxSteps?: number; maxCost?: number; maxRuntimeMs?: number };
}

export interface MissionPlan {
  id: string;
  goal: string;
  phases: Array<{ id:string; capability:string; dependsOn:string[]; mode:"primary"|"fallback" }>;
  budget: MissionIntent["budget"];
}

export interface O1RunEvent {
  type: "mission.created" | "phase.expanded" | "policy.decided";
  at: string;
  data: Record<string, unknown>;
}

export function buildMission(intent: MissionIntent): { plan: MissionPlan; events: O1RunEvent[] } {
  const events: O1RunEvent[] = [];
  const phases: MissionPlan["phases"] = [];
  let previous: string[] = [];
  for (const capabilityId of intent.capabilities) {
    const expanded = expandCapability(capabilityId, intent.qualityScore ?? 1);
    for (const id of expanded) {
      const phaseId = intent.id + ":" + id;
      phases.push({ id:phaseId, capability:id, dependsOn:[...previous], mode:id === capabilityId ? "primary" : "fallback" });
      events.push({ type:"phase.expanded", at:new Date().toISOString(), data:{ missionId:intent.id, capability:id, parent:capabilityId } });
      previous = [phaseId];
    }
  }
  const plan: MissionPlan = { id:intent.id, goal:intent.goal, phases, budget:intent.budget };
  events.unshift({ type:"mission.created", at:new Date().toISOString(), data:{ missionId:intent.id, phaseCount:phases.length } });
  return { plan, events };
}

export function authorizeTool(input: { actorId:string; tool:string; risk:O1Risk; target?:string; explicitApproval?:boolean; dryRun?:boolean }): { decision:O1Decision; reason:string; risk:O1Risk } {
  const result = evaluatePolicy(input);
  return { decision:result.decision, reason:result.reason, risk:result.auditClass };
}

export function modelRoute(input: { complexity:number; latencySensitive?:boolean; budget?:number }) {
  if (input.latencySensitive && input.complexity < 0.35) return "fast";
  if (input.complexity >= 0.8) return "max";
  if (input.budget !== undefined && input.budget < 0.2) return "aether";
  return "standard";
}


export interface MissionStage {
  id: string;
  capability: string;
  specialists: SpecialistAgent[];
  parallel: boolean;
}

export function buildExecutionStages(capabilities: string[], qualityScore = 1): MissionStage[] {
  return capabilities.map((id) => ({
    id: "stage:" + id,
    capability: id,
    specialists: qualityScore < 0.85 ? specialistAgents(id) : [],
    parallel: qualityScore < 0.85 && specialistAgents(id).length > 1,
  }));
}

export function requiresVerification(capabilityId: string) {
  return [
    "mission-governor","multi-agent-swarm","computer-control","shell-sandbox",
    "patch-engine","code-review","security-review","model-router","approval-kernel",
    "policy-gateway","mcp-gateway","messaging-fabric","billing-entitlements",
  ].includes(capabilityId);
}
