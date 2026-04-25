import { MemoryStore } from "./types";

export function compactMemory(store: MemoryStore, maxEntries = 500): MemoryStore {
  const dedup = new Map<string, typeof store.entries[number]>();
  for (const entry of store.entries) {
    if (entry.stale) continue;
    const key = `${entry.scope}:${entry.topic}`.toLowerCase();
    if (!dedup.has(key)) dedup.set(key, entry);
  }
  return { entries: Array.from(dedup.values()).slice(0, maxEntries) };
}
