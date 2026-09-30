export interface O1ParallelTask<T> {
  id: string;
  dependsOn: string[];
  run: () => Promise<T>;
}

export interface O1ParallelTaskResult<T> {
  id: string;
  status: "succeeded" | "failed";
  value?: T;
  error?: string;
}

export async function executeParallelTasks<T>(tasks: readonly O1ParallelTask<T>[], concurrency = 4) {
  if (concurrency < 1 || !Number.isInteger(concurrency)) throw new Error("Concurrency must be a positive integer");
  const pending = new Map(tasks.map((task) => [task.id, task]));
  const results = new Map<string, O1ParallelTaskResult<T>>();
  const running = new Set<Promise<void>>();

  while (pending.size || running.size) {
    const ready = [...pending.values()].filter((task) => task.dependsOn.every((dependency) => results.get(dependency)?.status === "succeeded"));
    const blocked = [...pending.values()].filter((task) => task.dependsOn.some((dependency) => results.get(dependency)?.status === "failed"));
    for (const task of blocked) {
      results.set(task.id, { id: task.id, status: "failed", error: "A dependency failed" });
      pending.delete(task.id);
    }
    while (running.size < concurrency && ready.length) {
      const task = ready.shift()!;
      pending.delete(task.id);
      const job = task.run().then(
        (value) => results.set(task.id, { id: task.id, status: "succeeded", value }),
        (error) => results.set(task.id, { id: task.id, status: "failed", error: error instanceof Error ? error.message : String(error) }),
      ).finally(() => running.delete(job));
      running.add(job);
    }
    if (running.size) await Promise.race(running);
    else if (pending.size) throw new Error("Task graph cannot make progress; check for an unresolved dependency cycle");
  }
  return tasks.map((task) => results.get(task.id)!);
}