export type MemoryScope =
  | "project"
  | "user_preference"
  | "architecture"
  | "decision"
  | "assumption"
  | "error"
  | "codebase"
  | "domain"
  | "release";

export type MemoryEntry = {
  id: string;
  scope: MemoryScope;
  topic: string;
  content: string;
  sourceEvidence?: string;
  createdAt: string;
  updatedAt: string;
  stale: boolean;
};

export type MemoryStore = {
  entries: MemoryEntry[];
};
