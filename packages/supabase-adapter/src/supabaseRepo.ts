import { actorOwnsProject, ProjectRepository, StoredProjectRecord } from "./types";

/**
 * Supabase-backed repository adapter.
 * This implementation performs direct project record get/upsert operations.
 */
export class SupabaseProjectRepository implements ProjectRepository {
  constructor(private readonly client: any) {}

  async getProject(projectId: string): Promise<StoredProjectRecord | null> {
    const { data, error } = await this.client
      .from("projects")
      .select("*")
      .eq("projectId", projectId)
      .single();

    if (error || !data) return null;

    return data as StoredProjectRecord;
  }

  async getProjectForActor(projectId: string, actorId: string): Promise<StoredProjectRecord | null> {
    const project = await this.getProject(projectId);
    return actorOwnsProject(project, actorId) ? project : null;
  }

  async upsertProject(record: StoredProjectRecord): Promise<void> {
    const { error } = await this.client
      .from("projects")
      .upsert(record, { onConflict: "projectId" });

    if (error) {
      throw new Error(`Supabase upsert failed: ${error.message}`);
    }
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
