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

export class DurableProjectRepository implements ProjectRepository {
  private readonly baseUrl: string;
  private readonly tableName: string;

  constructor(private readonly options: DurableProjectRepositoryOptions) {
    this.baseUrl = normalizeBaseUrl(options.baseUrl);
    this.tableName = options.tableName || "orchestrator_projects";
  }

  private get headers(): Record<string, string> {
    return {
      apikey: this.options.serviceRoleKey,
      Authorization: `Bearer ${this.options.serviceRoleKey}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    };
  }

  async getProject(projectId: string): Promise<StoredProjectRecord | null> {
    const url = `${this.baseUrl}/rest/v1/${this.tableName}?project_id=eq.${encodeURIComponent(projectId)}&select=*`;
    const res = await fetch(url, {
      method: "GET",
      headers: this.headers,
    });

    if (!res.ok) {
      const body = await parseJsonSafe(res);
      throw new Error(`Durable repository getProject failed ${res.status}: ${JSON.stringify(body)}`);
    }

    const rows = (await parseJsonSafe(res)) as ProjectRow[] | null;
    if (!rows || rows.length === 0) {
      return null;
    }

    return fromRow(rows[0]);
  }

  async upsertProject(record: StoredProjectRecord): Promise<void> {
    const row = toRow({
      ...record,
      updatedAt: new Date().toISOString(),
    });

    const url = `${this.baseUrl}/rest/v1/${this.tableName}?on_conflict=project_id`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        ...this.headers,
        Prefer: "resolution=merge-duplicates,return=representation",
      },
      body: JSON.stringify([row]),
    });

    if (!res.ok) {
      const body = await parseJsonSafe(res);
      throw new Error(`Durable repository upsertProject failed ${res.status}: ${JSON.stringify(body)}`);
    }
  }
}
