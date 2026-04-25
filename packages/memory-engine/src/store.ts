import { MemoryEntry, MemoryScope, MemoryStore } from "./types";

function now(): string {
  return new Date().toISOString();
}

export function createMemoryStore(): MemoryStore {
  return { entries: [] };
}

export function recordMemory(
  store: MemoryStore,
  input: { scope: MemoryScope; topic: string; content: string; sourceEvidence?: string }
): MemoryEntry {
  const entry: MemoryEntry = {
    id: `mem_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    scope: input.scope,
    topic: input.topic,
    content: input.content,
    sourceEvidence: input.sourceEvidence,
    createdAt: now(),
    updatedAt: now(),
    stale: false,
  };
  store.entries.unshift(entry);
  return entry;
}

export function markStale(store: MemoryStore, id: string): void {
  store.entries = store.entries.map((entry) =>
    entry.id === id ? { ...entry, stale: true, updatedAt: now() } : entry
  );
}
