import { ProjectRepository, StoredProjectRecord } from "./types";

type DurableProjectRepositoryOptions = {
  baseUrl: string;
  serviceRoleKey: string;
  tableName?: string;
};

type ProjectRow = {
  project_id: string;
  name: string;
  request: string;
  status: string;
  master_truth: Record<string, unknown> | null;
  plan: Record<string, unknown> | null;
  runs: Record<string, unknown> | null;
  validations: Record<string, unknown> | null;
  git_operations: Record<string, unknown> | null;
  git_results: Record<string, unknown> | null;
  audit_events: unknown[] | null;
  created_at: string;
  updated_at: string;
};

function normalizeBaseUrl(url: string): string {
  return url.replace(/\/$/, "");
}

function toRow(record: StoredProjectRecord): ProjectRow {
  return {
    project_id: record.projectId,
    name: record.name,
    request: record.request,
    status: record.status,
    master_truth: record.masterTruth ?? null,
    plan: record.plan ?? null,
    runs: record.runs ?? null,
    validations: record.validations ?? null,
    git_operations: record.gitOperations ?? null,
    git_results: record.gitResults ?? null,
    audit_events: record.auditEvents ?? null,
    created_at: record.createdAt,
    updated_at: record.updatedAt,
  };
}

function fromRow(row: ProjectRow): StoredProjectRecord {
  return {
    projectId: row.project_id,
    name: row.name,
    request: row.request,
    status: row.status,
    masterTruth: row.master_truth,
    plan: row.plan,
    runs: row.runs,
    validations: row.validations,
    gitOperations: row.git_operations,
    gitResults: row.git_results,
    auditEvents: row.audit_events,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function parseJsonSafe(res: Response): Promise<any> {
  const text = await res.text();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

function joinUrl(baseUrl: string, path: string): string {
  return `${baseUrl}/rest/v1/${path}`;
}

export class DurableProjectRepository implements ProjectRepository {
  private readonly baseUrl: string;
  private readonly tableName: string;

  constructor(private readonly options: DurableProjectRepositoryOptions) {
    this.baseUrl = normalizeBaseUrl(options.baseUrl);
    this.tableName = options.tableName || "orchestrator_projects";
  }

  private get authHeaders(): Record<string, string> {
    return {
      apikey: this.options.serviceRoleKey,
      Authorization: `Bearer ${this.options.serviceRoleKey}`,
    };
  }

  private get jsonHeaders(): Record<string, string> {
    return {
      ...this.authHeaders,
      "Content-Type": "application/json",
    };
  }

  async getProject(projectId: string): Promise<StoredProjectRecord | null> {
    const url = joinUrl(
      this.baseUrl,
      `${this.tableName}?project_id=eq.${encodeURIComponent(projectId)}&select=*`
    );

    const res = await fetch(url, {
      method: "GET",
      headers: {
        ...this.authHeaders,
        Accept: "application/json",
      },
    });

    if (!res.ok) {
      const body = await parseJsonSafe(res);
      throw new Error(
        `Durable repository getProject failed ${res.status}: ${JSON.stringify(body)}`
      );
    }

    const rows = (await parseJsonSafe(res)) as ProjectRow[] | null;
    if (!rows || rows.length === 0) {
      return null;
    }

    return fromRow(rows[0]);
  }

  private async assertReadable(projectId: string): Promise<void> {
    const readback = await this.getProject(projectId);
    if (!readback) {
      throw new Error(
        `Durable repository write succeeded but readback failed for ${projectId}`
      );
    }
  }

  async upsertProject(record: StoredProjectRecord): Promise<void> {
    const existing = await this.getProject(record.projectId);
    const nowIso = new Date().toISOString();

    const normalized: StoredProjectRecord = {
      ...record,
      createdAt: existing?.createdAt || record.createdAt || nowIso,
      updatedAt: nowIso,
    };

    const row = toRow(normalized);
    const encodedProjectId = encodeURIComponent(normalized.projectId);

    if (existing) {
      // Use the previous updated_at as an ETag — if another worker already wrote a newer
      // version, the PATCH matches 0 rows and we throw a conflict rather than silently
      // overwriting concurrent changes (last-write-wins race condition).
      const encodedPrevUpdatedAt = encodeURIComponent(existing.updatedAt);
      const updateUrl = joinUrl(
        this.baseUrl,
        `${this.tableName}?project_id=eq.${encodedProjectId}&updated_at=eq.${encodedPrevUpdatedAt}`
      );

      const updateRes = await fetch(updateUrl, {
        method: "PATCH",
        headers: {
          ...this.jsonHeaders,
          Prefer: "return=representation",
        },
        body: JSON.stringify(row),
      });

      if (!updateRes.ok) {
        const body = await parseJsonSafe(updateRes);
        throw new Error(
          `Durable repository update failed ${updateRes.status}: ${JSON.stringify(body)}`
        );
      }

      const updated = await parseJsonSafe(updateRes);
      if (!Array.isArray(updated) || updated.length === 0) {
        throw new Error(
          `Durable repository conflict: project ${normalized.projectId} was modified by another worker. Re-read and retry.`
        );
      }

      return;
    }

    const insertUrl = joinUrl(this.baseUrl, this.tableName);
    const insertRes = await fetch(insertUrl, {
      method: "POST",
      headers: {
        ...this.jsonHeaders,
        Prefer: "return=representation",
      },
      body: JSON.stringify(row),
    });

    if (!insertRes.ok) {
      const body = await parseJsonSafe(insertRes);
      throw new Error(
        `Durable repository insert failed ${insertRes.status}: ${JSON.stringify(body)}`
      );
    }

    await this.assertReadable(normalized.projectId);
  }
}
