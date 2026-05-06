import { actorOwnsProject, ProjectRepository, StoredProjectRecord } from "./types";

/**
 * Transitional repository (in-memory fallback with same interface as Supabase).
 * This lets us swap to real DB without touching orchestrator logic.
 */
export class InMemoryProjectRepository implements ProjectRepository {
  private store = new Map<string, StoredProjectRecord>();

  async getProject(projectId: string): Promise<StoredProjectRecord | null> {
    return this.store.get(projectId) || null;
  }

  async getProjectForActor(projectId: string, actorId: string): Promise<StoredProjectRecord | null> {
    const project = await this.getProject(projectId);
    return actorOwnsProject(project, actorId) ? project : null;
  }

  async upsertProject(record: StoredProjectRecord): Promise<void> {
    this.store.set(record.projectId, {
      ...record,
      updatedAt: new Date().toISOString()
    });
  }

  async upsertProjectForActor(record: StoredProjectRecord, actorId: string): Promise<void> {
    const existing = await this.getProject(record.projectId);
    if (existing && !actorOwnsProject(existing, actorId)) {
      throw new Error("Project ownership mismatch");
    }
    if (record.ownerUserId !== actorId) {
      throw new Error("Project owner must match actor");
    }
    await this.upsertProject(record);
  }
}
