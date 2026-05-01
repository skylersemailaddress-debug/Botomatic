import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { sanitizeProjectId } from "./executionStore";

export type RuntimeState = "stopped" | "starting" | "running" | "stopping" | "errored";
export type RuntimeProof = { healthcheckUrl?: string; healthcheckStatus?: number; verifiedAt?: string; verifier?: string; receiptId?: string; checksum?: string };
export type RuntimeLog = { ts: string; level: "info" | "warn" | "error"; message: string; redacted: boolean; source: "runtime"; runId?: string };
export type RuntimeRecord = { projectId: string; state: RuntimeState; verifiedPreviewUrl?: string; derivedPreviewUrl?: string; proof?: RuntimeProof; logs: RuntimeLog[]; updatedAt: string; lastError?: string; idempotency?: Record<string, string> };

function discoverRepoRoot(start: string): string {
  let current = path.resolve(start);
  while (true) {
    if (fs.existsSync(path.join(current, "package.json"))) return current;
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }
  return path.resolve(start);
}

const repoRoot = discoverRepoRoot(process.cwd());
const DATA_ROOT = path.join(repoRoot, "data", "runtime");
const nowIso = () => new Date().toISOString();
const ensureRoot = () => fs.mkdirSync(DATA_ROOT, { recursive: true });
const filePath = (projectId: string) => path.join(DATA_ROOT, `${sanitizeProjectId(projectId)}.json`);

export const checksum = (value: unknown): string => crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex");
export const redactLine = (input: string): string => input.replace(/(token|secret|password|apikey|api_key)\s*[:=]\s*[^\s]+/gi, "$1=[REDACTED]").replace(/bearer\s+[a-z0-9\-_.]+/gi, "bearer [REDACTED]");

export function sanitizeRuntimeUrl(url?: string): string | undefined {
  if (!url) return undefined;
  try {
    const parsed = new URL(url);
    if (!parsed.protocol || !["http:", "https:"].includes(parsed.protocol)) return undefined;
    return parsed.toString();
  } catch {
    return undefined;
  }
}

export function loadRuntime(projectId: string): RuntimeRecord | null {
  ensureRoot();
  const fp = filePath(projectId);
  if (!fs.existsSync(fp)) return null;
  try {
    const parsed = JSON.parse(fs.readFileSync(fp, "utf8"));
    return {
      projectId: sanitizeProjectId(projectId),
      state: parsed?.state || "stopped",
      verifiedPreviewUrl: parsed?.verifiedPreviewUrl,
      derivedPreviewUrl: parsed?.derivedPreviewUrl,
      proof: parsed?.proof,
      logs: Array.isArray(parsed?.logs) ? parsed.logs : [],
      updatedAt: parsed?.updatedAt || nowIso(),
      lastError: parsed?.lastError,
      idempotency: parsed?.idempotency && typeof parsed.idempotency === "object" ? parsed.idempotency : {},
    };
  } catch {
    return null;
  }
}

export function saveRuntime(projectId: string, runtime: RuntimeRecord): RuntimeRecord {
  ensureRoot();
  const next = { ...runtime, projectId: sanitizeProjectId(projectId), updatedAt: nowIso(), logs: runtime.logs.slice(-200) };
  fs.writeFileSync(filePath(projectId), JSON.stringify(next, null, 2));
  return next;
}

export function appendRuntimeLog(runtime: RuntimeRecord, level: RuntimeLog["level"], message: string, runId?: string): RuntimeRecord {
  const redactedMessage = redactLine(message);
  const row: RuntimeLog = { ts: nowIso(), level, message: redactedMessage, redacted: redactedMessage !== message || /\[REDACTED\]/.test(redactedMessage), source: "runtime", runId };
  return { ...runtime, logs: [...runtime.logs, row].slice(-200), updatedAt: nowIso() };
}

export function emptyRuntime(projectId: string): RuntimeRecord {
  return { projectId: sanitizeProjectId(projectId), state: "stopped", logs: [], updatedAt: nowIso(), idempotency: {} };
}
