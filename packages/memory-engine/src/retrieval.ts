import { MemoryEntry, MemoryScope, MemoryStore } from "./types";

export function retrieveMemory(store: MemoryStore, scope?: MemoryScope): MemoryEntry[] {
  return store.entries.filter((entry) => !entry.stale && (!scope || entry.scope === scope));
}

export function retrieveByTopic(store: MemoryStore, topic: string): MemoryEntry[] {
  const lower = topic.toLowerCase();
  return store.entries.filter((entry) => !entry.stale && entry.topic.toLowerCase().includes(lower));
}
