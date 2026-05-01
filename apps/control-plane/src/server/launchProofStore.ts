import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { loadProjectState, sanitizeProjectId } from "./executionStore";
import { loadRuntime } from "./runtimeStore";

export type LaunchProofStatus = "missing" | "verifying" | "verified" | "failed" | "blocked";
export type DeploymentStatus = "blocked" | "queued" | "deploying" | "deployed" | "failed" | "rolled_back";

export type LaunchProof = {
  verified: boolean;
  verifiedAt?: string;
  verifier?: string;
  runtimeReceiptId?: string;
  runtimeChecksum?: string;
  executionRunId?: string;
  testReceiptId?: string;
  buildReceiptId?: string;
  artifactManifestPath?: string;
  checksum?: string;
  notes?: string[];
};

export type DeploymentRecord = {
  deploymentId: string;
  projectId: string;
  status: DeploymentStatus;
  createdAt: string;
  updatedAt: string;
  target?: string;
  receiptId?: string;
  rollbackOf?: string;
  checksum?: string;
  error?: string;
};

export type LaunchProofLog = {
  ts: string;
  level: "info" | "warn" | "error";
  message: string;
  redacted: boolean;
  source: "launch-proof";
};

export type LaunchProofRecord = {
  projectId: string;
  launchReady: boolean;
  status: LaunchProofStatus;
  message?: string;
  launchProof?: LaunchProof;
  releaseEvidence?: {
    launchReady: boolean;
    checksum?: string;
    updatedAt?: string;
  };
  deploymentRecords: DeploymentRecord[];
  logs: LaunchProofLog[];
  updatedAt: string;
  lastError?: string;
  idempotency?: Record<string, string>;
};

const nowIso = () => new Date().toISOString();

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
const DATA_ROOT = path.join(repoRoot, "data", "launch-proof");
const ensureRoot = () => fs.mkdirSync(DATA_ROOT, { recursive: true });
const filePath = (projectId: string) => path.join(DATA_ROOT, `${sanitizeProjectId(projectId)}.json`);

export function checksum(value: unknown): string {
  return crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

export function redactLine(input: string): string {
  return input
    .replace(/(token|secret|password|apikey|api_key)\s*[:=]\s*[^\s]+/gi, "$1=[REDACTED]")
    .replace(/bearer\s+[a-z0-9\-_.]+/gi, "bearer [REDACTED]");
}

export function emptyLaunchProof(projectId: string): LaunchProofRecord {
  return {
    projectId: sanitizeProjectId(projectId),
    launchReady: false,
    status: "missing",
    message: "No launch proof yet",
    deploymentRecords: [],
    logs: [],
    updatedAt: nowIso(),
    idempotency: {},
  };
}

export function loadLaunchProof(projectId: string): LaunchProofRecord | null {
  ensureRoot();
  const fp = filePath(projectId);
  if (!fs.existsSync(fp)) return null;
  try {
    const parsed = JSON.parse(fs.readFileSync(fp, "utf8"));
    return {
      projectId: sanitizeProjectId(projectId),
      launchReady: parsed?.launchReady === true,
      status: parsed?.status || "missing",
      message: parsed?.message,
      launchProof: parsed?.launchProof,
      releaseEvidence: parsed?.releaseEvidence,
      deploymentRecords: Array.isArray(parsed?.deploymentRecords) ? parsed.deploymentRecords : [],
      logs: Array.isArray(parsed?.logs) ? parsed.logs : [],
      updatedAt: parsed?.updatedAt || nowIso(),
      lastError: parsed?.lastError,
      idempotency: parsed?.idempotency && typeof parsed.idempotency === "object" ? parsed.idempotency : {},
    };
  } catch {
    return null;
  }
}

export function saveLaunchProof(projectId: string, record: LaunchProofRecord): LaunchProofRecord {
  ensureRoot();
  const next = {
    ...record,
    projectId: sanitizeProjectId(projectId),
    updatedAt: nowIso(),
    logs: record.logs.slice(-200),
    deploymentRecords: record.deploymentRecords.slice(-100),
  };
  fs.writeFileSync(filePath(projectId), JSON.stringify(next, null, 2));
  return next;
}

export function appendLaunchLog(record: LaunchProofRecord, level: LaunchProofLog["level"], message: string): LaunchProofRecord {
  const redactedMessage = redactLine(message);
  return {
    ...record,
    logs: [
      ...record.logs,
      { ts: nowIso(), level, message: redactedMessage, redacted: redactedMessage !== message || /\[REDACTED\]/.test(redactedMessage), source: "launch-proof" as const },
    ].slice(-200),
    updatedAt: nowIso(),
  };
}

export function hasVerifiedLaunchProof(record: LaunchProofRecord): boolean {
  return record.launchReady === true && record.launchProof?.verified === true && record.status === "verified";
}

export function verifyLaunchPreconditions(projectId: string): { ok: true; proof: LaunchProof } | { ok: false; missing: string[] } {
  const sanitizedProjectId = sanitizeProjectId(projectId);
  const missing: string[] = [];
  const runtime = loadRuntime(sanitizedProjectId);
  const execution = loadProjectState(sanitizedProjectId);

  if (runtime?.state !== "running") missing.push("runtime running state");
  if (!runtime?.verifiedPreviewUrl) missing.push("verified runtime preview url");
  if (!runtime?.proof?.receiptId) missing.push("runtime proof receiptId");
  if (!runtime?.proof?.checksum) missing.push("runtime proof checksum");

  const runs = Array.isArray(execution.runs) ? execution.runs : [];
  const successfulJobs = runs.flatMap((run) => run.jobs.map((job) => ({ run, job }))).filter(({ job }) => job.status === "succeeded");
  const preferredBuild = successfulJobs.find(({ job }) => job.type === "build");
  const preferredTest = successfulJobs.find(({ job }) => job.type === "test");
  const selected = preferredBuild || preferredTest || successfulJobs.find(({ job }) => job.type === "file_diff" || job.type === "lint" || job.type === "typecheck");
  if (!selected) missing.push("successful allowlisted execution job");

  if (missing.length) return { ok: false, missing };

  const proof: LaunchProof = {
    verified: true,
    verifiedAt: nowIso(),
    verifier: "launch.verify.route",
    runtimeReceiptId: runtime?.proof?.receiptId,
    runtimeChecksum: runtime?.proof?.checksum,
    executionRunId: selected?.run.runId,
    testReceiptId: selected?.job.type === "test" ? selected.job.id : undefined,
    buildReceiptId: selected?.job.type === "build" ? selected.job.id : undefined,
    artifactManifestPath: selected?.job.artifactPath,
    notes: ["runtime proof verified", `execution job ${selected?.job.type} succeeded`],
  };
  proof.checksum = checksum({ projectId: sanitizedProjectId, proof });
  return { ok: true, proof };
}

export function createDeploymentRecord(projectId: string, status: DeploymentStatus, error?: string, rollbackOf?: string, target?: string): DeploymentRecord {
  const ts = nowIso();
  const record: DeploymentRecord = {
    deploymentId: `dep_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    projectId: sanitizeProjectId(projectId),
    status,
    createdAt: ts,
    updatedAt: ts,
    target,
    rollbackOf,
    receiptId: `receipt_${Date.now().toString(36)}`,
    error,
  };
  record.checksum = checksum(record);
  return record;
}
