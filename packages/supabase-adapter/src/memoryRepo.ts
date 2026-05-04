import { ProjectRepository, StoredProjectRecord } from "./types";

const MAX_PROJECTS = 2000;

/**
 * In-memory repository with per-project write serialization and LRU eviction.
 * Concurrent upserts for the same project are chained so writes never race.
 */
export class InMemoryProjectRepository implements ProjectRepository {
  private store = new Map<string, StoredProjectRecord>();
  // Per-project write lock: each project's writes are chained onto this promise
  private locks = new Map<string, Promise<void>>();

  async getProject(projectId: string): Promise<StoredProjectRecord | null> {
    const record = this.store.get(projectId);
    if (!record) return null;
    // Return a deep copy so callers can't mutate the store directly
    return JSON.parse(JSON.stringify(record)) as StoredProjectRecord;
  }

  async upsertProject(record: StoredProjectRecord): Promise<void> {
    const prior = this.locks.get(record.projectId) ?? Promise.resolve();
    const next = prior.then(() => {
      // Merge with existing rather than overwrite — prevents lost updates
      // when two workers read-modify-write the same project concurrently
      const existing = this.store.get(record.projectId);
      this.store.set(record.projectId, {
        ...(existing ?? {}),
        ...record,
        updatedAt: new Date().toISOString(),
      });

      // Evict oldest entries when over the limit (LRU by updatedAt)
      if (this.store.size > MAX_PROJECTS) {
        const sorted = Array.from(this.store.entries()).sort(
          ([, a], [, b]) => new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime()
        );
        for (const [id] of sorted.slice(0, this.store.size - MAX_PROJECTS)) {
          this.store.delete(id);
          this.locks.delete(id);
        }
      }
    });
    this.locks.set(record.projectId, next);
    await next;
  }
}
