import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

export type RunStatus = "queued" | "running" | "succeeded" | "failed" | "blocked" | "cancelled";
export type AllowedJobType = "test" | "build" | "file_diff" | "lint" | "typecheck";
export type StoredJob = { id: string; runId: string; projectId: string; type: AllowedJobType; label: string; status: RunStatus; startedAt?: string; completedAt?: string; error?: string; resultSummary?: string; artifactPath?: string; logLines: string[]; operation: string; exitCode?: number; checksum?: string; redactionStatus: "redacted" | "none" };
export type StoredRun = { runId: string; projectId: string; status: RunStatus; jobs: StoredJob[]; logs: string[]; createdAt: string; updatedAt: string; objective?: string; latestPrompt?: string; idempotencyKey?: string };

type IdemRecord = { type: "execution" | "job"; runId: string; jobId?: string };
export type ProjectExecutionState = { runs: StoredRun[]; idempotency: Record<string, IdemRecord> };

const DATA_ROOT = path.resolve(process.cwd(), "data/execution");
export const sanitizeProjectId = (projectId: string): string => projectId.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 120) || "default";
const nowIso = () => new Date().toISOString();
const ensureRoot = () => fs.mkdirSync(DATA_ROOT, { recursive: true });
const filePath = (projectId: string) => path.join(DATA_ROOT, `${sanitizeProjectId(projectId)}.json`);

export function redactLine(input: string): string {
  return input
    .replace(/\bBearer\s+(?!<[^>]+>)(?!\$\{[^}]+\})(?!\[REDACTED\])[A-Za-z0-9._\-]{16,}\b/gi, "Bearer [REDACTED]")
    .replace(/\b(?:sk-(?:proj-|admin-)?[A-Za-z0-9_-]{20,}|sk-ant-[A-Za-z0-9_-]{16,}|gh[pousr]_[0-9A-Za-z_]{20,}|sb_(?:secret|service_role)_[A-Za-z0-9_-]{16,})\b/g, "[REDACTED]")
    .replace(/https:\/\/[a-z0-9]{18,}\.supabase\.co\b/gi, "https://[REDACTED].supabase.co")
    .replace(/(token|secret|password|apikey|api_key|service_role|jwt_secret)\s*[:=]\s*[^\s]+/gi, "$1=[REDACTED]")
    .replace(/-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/g, "-----BEGIN [REDACTED] PRIVATE KEY-----");
}
export function checksum(value: unknown): string { return crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex"); }

export function loadProjectState(projectId: string): ProjectExecutionState {
  ensureRoot();
  const fp = filePath(projectId);
  if (!fs.existsSync(fp)) return { runs: [], idempotency: {} };
  try { const parsed = JSON.parse(fs.readFileSync(fp, "utf8")); return { runs: Array.isArray(parsed?.runs) ? parsed.runs : [], idempotency: parsed?.idempotency && typeof parsed.idempotency === "object" ? parsed.idempotency : {} }; } catch { return { runs: [], idempotency: {} }; }
}

export function saveProjectState(projectId: string, state: ProjectExecutionState): void { ensureRoot(); fs.writeFileSync(filePath(projectId), JSON.stringify(state, null, 2)); }
export function appendLog(lines: string[], message: string): string[] { return [...lines, `[${nowIso()}] ${redactLine(message)}`].slice(-200); }

export function createRun(projectId: string, idempotencyKey: string, objective?: string, latestPrompt?: string): StoredRun {
  const ts = nowIso();
  return { runId: `run_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`, projectId, status: "queued", jobs: [], logs: [`[${ts}] Run queued.`], createdAt: ts, updatedAt: ts, objective, latestPrompt, idempotencyKey };
}
