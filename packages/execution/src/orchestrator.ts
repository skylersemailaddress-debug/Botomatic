import { sortJobsByPriority } from "./priority";
import { runParallel } from "./parallelism";
import { filterRunnablePackets } from "./dependencies";

export async function orchestratePackets<T extends { packetId: string; dependsOn?: string[]; priority?: "low" | "normal" | "high" | "critical" }>(input: {
  packets: T[];
  completed: Set<string>;
  concurrency: number;
  runner: (packet: T) => Promise<unknown>;
}) {
  const runnable = filterRunnablePackets(input.packets, input.completed);
  const ordered = sortJobsByPriority(runnable.map((packet) => ({ ...packet, createdAt: packet.packetId })));
  const tasks = ordered.map((packet) => () => input.runner(packet as T));
  return runParallel(tasks, input.concurrency);
}
