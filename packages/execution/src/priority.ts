export type JobPriority = "low" | "normal" | "high" | "critical";

export function priorityRank(priority: JobPriority): number {
  switch (priority) {
    case "critical": return 4;
    case "high": return 3;
    case "normal": return 2;
    case "low": return 1;
    default: return 2;
  }
}

export function sortJobsByPriority<T extends { priority?: JobPriority; createdAt?: string }>(jobs: T[]): T[] {
  return [...jobs].sort((a, b) => {
    const pr = priorityRank(b.priority || "normal") - priorityRank(a.priority || "normal");
    if (pr !== 0) return pr;
    return String(a.createdAt || "").localeCompare(String(b.createdAt || ""));
  });
}
