import { ProjectRepository, StoredProjectRecord } from "./types";

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

  async upsertProject(record: StoredProjectRecord): Promise<void> {
    const { error } = await this.client
      .from("projects")
      .upsert(record, { onConflict: "projectId" });

    if (error) {
      throw new Error(`Supabase upsert failed: ${error.message}`);
    }
  }
}
