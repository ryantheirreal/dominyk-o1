export interface O1TaskNode {
  id: string;
  missionId: string;
  title: string;
  dependsOn: string[];
  status: "pending" | "ready" | "running" | "completed" | "failed" | "blocked";
}

export function validateTaskGraph(nodes: readonly O1TaskNode[]) {
  const byId = new Map<string, O1TaskNode>();
  for (const node of nodes) {
    if (byId.has(node.id)) throw new Error(`Duplicate task id: ${node.id}`);
    byId.set(node.id, node);
  }
  for (const node of nodes) {
    for (const dependency of node.dependsOn) {
      if (!byId.has(dependency)) throw new Error(`Unknown dependency: ${node.id} -> ${dependency}`);
    }
  }
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const visit = (id: string) => {
    if (visiting.has(id)) throw new Error(`Task graph cycle detected at ${id}`);
    if (visited.has(id)) return;
    visiting.add(id);
    for (const dependency of byId.get(id)?.dependsOn ?? []) visit(dependency);
    visiting.delete(id);
    visited.add(id);
  };
  for (const node of nodes) visit(node.id);
}

export function readyTaskBatches(nodes: readonly O1TaskNode[]) {
  validateTaskGraph(nodes);
  const completed = new Set(nodes.filter((node) => node.status === "completed").map((node) => node.id));
  return nodes
    .filter((node) => node.status === "pending" || node.status === "ready")
    .filter((node) => node.dependsOn.every((dependency) => completed.has(dependency)))
    .map((node) => node.id);
}