import { ProjectRepository, StoredProjectRecord } from "./types";

/**
 * Transitional repository (in-memory fallback with same interface as Supabase).
 * This lets us swap to real DB without touching orchestrator logic.
 */
export class InMemoryProjectRepository implements ProjectRepository {
  private store = new Map<string, StoredProjectRecord>();

  async getProject(projectId: string): Promise<StoredProjectRecord | null> {
    return this.store.get(projectId) || null;
  }

  async upsertProject(record: StoredProjectRecord): Promise<void> {
    this.store.set(record.projectId, {
      ...record,
      updatedAt: new Date().toISOString()
    });
  }
}
