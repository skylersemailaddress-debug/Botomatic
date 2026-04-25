import express from "express";
import multer from "multer";
import { PDFParse } from "pdf-parse";
import { compileConversationToMasterTruth } from "../../../packages/master-truth/src/compiler";
import { generatePlan } from "../../../packages/packet-engine/src/generator";
import {
  analyzeSpec,
  approveAssumptions,
  approveBuildContract,
  applyRecommendationStatus,
  computeBuildBlockStatus,
  generateBuildContract,
  MasterSpec,
  BuildContract,
  SpecAssumption,
  SpecRecommendation,
} from "../../../packages/spec-engine/src";
import { matchBlueprintFromText } from "../../../packages/blueprints/src/registry";
import { markPacketComplete, markPacketFailed } from "../../../packages/execution/src/runner";
import { MockExecutor } from "../../../packages/executor-adapters/src/mockExecutor";
import { ClaudeCodeExecutor } from "../../../packages/executor-adapters/src/claudeCodeExecutor";
import { runValidation } from "../../../packages/validation/src/runner";
import { createGitOperation, GitOperationRequest, GitOperationResult } from "../../../packages/github-adapter/src/operations";
import { GitHubRuntime } from "../../../packages/github-adapter/src/githubRuntime";
import { enqueueJob, claimJob, finalizeJob, getQueueStats } from "../../../packages/supabase-adapter/src/jobClient";
import { GovernanceApprovalState, StoredProjectRecord } from "../../../packages/supabase-adapter/src/types";
import { RuntimeConfig } from "./config";
import { type AuthContext } from "./auth/roles";
import { verifyOidcBearerToken } from "./auth/oidc";

type VerifiedRequestAuth = AuthContext & { issuer?: string };

type RequestActor = {
  actorId: string;
  actorSource: "oidc" | "bearer_token" | "anonymous";
};

type QueueJobRecord = {
  job_id: string;
  project_id: string;
  packet_id: string;
  status: "queued" | "running" | "succeeded" | "failed";
  attempts: number;
};

type ChangedFile = {
  path?: string;
  body?: string;
};

const workerId = process.env.WORKER_ID || `worker_${Math.random().toString(36).slice(2, 8)}`;
const leaseMs = Number(process.env.QUEUE_LEASE_MS || 30000);
const workerConcurrency = Math.max(1, Number(process.env.WORKER_CONCURRENCY || 2));
const governanceStateRunKey = "__governanceGate4Approval";
const deploymentStateRunKey = "__deploymentState";
const intakeArtifactsRunKey = "__intakeArtifacts";
const specStateRunKey = "__masterSpec";
const specClarificationsRunKey = "__specClarifications";
const specStyleRunKey = "__specStyle";
const buildContractRunKey = "__buildContract";
let workerStarted = false;
let activeWorkers = 0;

type OpsErrorType = "route_error" | "packet_failed" | "promotion_failed" | "auth_failed" | "alert_delivery_failed";
type OpsErrorEvent = {
  id: string;
  type: OpsErrorType;
  message: string;
  timestamp: string;
  metadata?: Record<string, any>;
};

const recentOpsErrors: OpsErrorEvent[] = [];
let packetSuccessCount = 0;
let packetFailureCount = 0;
let validationPassCount = 0;
let validationFailCount = 0;
let promotionCount = 0;
let routeErrorCount = 0;
let alertDeliverySuccessCount = 0;
let alertDeliveryFailureCount = 0;
let telemetryUpdatedAt = now();

function now(): string {
  return new Date().toISOString();
}

function makeRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function updateTelemetryTimestamp() {
  telemetryUpdatedAt = now();
}

function recordOpsError(type: OpsErrorType, message: string, metadata?: Record<string, any>) {
  recentOpsErrors.unshift({
    id: `ops_err_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    type,
    message,
    timestamp: now(),
    metadata,
  });
  if (recentOpsErrors.length > 200) {
    recentOpsErrors.length = 200;
  }
  updateTelemetryTimestamp();
}

function toStored(record: {
  projectId: string;
  name: string;
  request: string;
  status: string;
  governanceApproval?: GovernanceApprovalState;
  masterTruth?: any;
  plan?: any;
  runs?: any;
  validations?: any;
  gitOperations?: Record<string, any>;
  gitResults?: Record<string, any>;
  deployments?: Record<string, any>;
  auditEvents?: any[];
}): StoredProjectRecord {
  const timestamp = now();
  return {
    projectId: record.projectId,
    name: record.name,
    request: record.request,
    status: record.status,
    governanceApproval: record.governanceApproval ?? null,
    masterTruth: record.masterTruth ?? null,
    plan: record.plan ?? null,
    runs: record.runs ?? null,
    validations: record.validations ?? null,
    gitOperations: record.gitOperations ?? null,
    gitResults: record.gitResults ?? null,
    createdAt: timestamp,
    updatedAt: timestamp,
    ...(record.deployments ? { deployments: record.deployments } : {}),
    ...(record.auditEvents ? { auditEvents: record.auditEvents } : {}),
  } as StoredProjectRecord;
}

function buildDefaultGovernanceApproval(actorId = "system"): GovernanceApprovalState {
  return {
    modelVersion: "gate4-minimal-v1",
    approvalStatus: "pending",
    runtimeProofRequired: true,
    runtimeProofStatus: "required",
    updatedAt: now(),
    updatedBy: actorId,
  };
}

function getGovernanceApprovalState(project: StoredProjectRecord): GovernanceApprovalState {
  const runs = ((project.runs || {}) as Record<string, unknown>);
  const fromRuns = runs[governanceStateRunKey] as GovernanceApprovalState | undefined;
  if (fromRuns && fromRuns.modelVersion === "gate4-minimal-v1") {
    return fromRuns;
  }
  if (project.governanceApproval && project.governanceApproval.modelVersion === "gate4-minimal-v1") {
    return project.governanceApproval;
  }
  return buildDefaultGovernanceApproval();
}

function validateGovernanceForAction(governanceApproval: GovernanceApprovalState, actionLabel: string): string[] {
  const missing: string[] = [];
  if (governanceApproval.runtimeProofRequired && governanceApproval.runtimeProofStatus !== "captured") {
    missing.push(`${actionLabel} requires runtime proof to be captured.`);
  }
  if (governanceApproval.approvalStatus !== "approved") {
    missing.push(`${actionLabel} requires governance approval.`);
  }
  return missing;
}

function ensureGovernanceApprovalState(project: StoredProjectRecord, actorId = "system") {
  const runs = ((project.runs || {}) as Record<string, unknown>);
  if (runs[governanceStateRunKey]) {
    project.governanceApproval = getGovernanceApprovalState(project);
    return;
  }
  const governance = project.governanceApproval && project.governanceApproval.modelVersion === "gate4-minimal-v1"
    ? project.governanceApproval
    : buildDefaultGovernanceApproval(actorId);
  project.runs = { ...runs, [governanceStateRunKey]: governance };
  project.governanceApproval = governance;
}

function getExecutor() {
  if (process.env.EXECUTOR === "claude") {
    return new ClaudeCodeExecutor({
      baseUrl: process.env.CLAUDE_EXECUTOR_URL!,
      apiKey: process.env.CLAUDE_EXECUTOR_KEY,
    });
  }
  return MockExecutor;
}

function getGitHub() {
  return new GitHubRuntime({
    token: process.env.GITHUB_TOKEN!,
    owner: "skylersemailaddress-debug",
    repo: "Botomatic",
  });
}

async function getVerifiedAuth(req: express.Request, config: RuntimeConfig): Promise<VerifiedRequestAuth> {
  const authorization = req.header("authorization") || "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";

  if (config.auth.implementation === "oidc" && config.auth.oidc) {
    if (!token) throw new Error("Missing bearer token");
    const identity = await verifyOidcBearerToken(token, config.auth.oidc);
    return { userId: identity.userId, role: identity.role, issuer: identity.issuer };
  }

  if (config.auth.implementation === "bearer_token" && config.auth.token) {
    if (token !== config.auth.token) throw new Error("Unauthorized");
    return { userId: `api_token:${String(config.auth.token).slice(0, 6)}`, role: "admin" };
  }

  return { userId: "anonymous", role: "operator" };
}

async function getRequestActor(req: express.Request, config: RuntimeConfig): Promise<RequestActor> {
  try {
    const auth = await getVerifiedAuth(req, config);
    return {
      actorId: auth.userId,
      actorSource: config.auth.implementation === "oidc" ? "oidc" : config.auth.implementation === "bearer_token" ? "bearer_token" : "anonymous",
    };
  } catch {
    return { actorId: "anonymous", actorSource: "anonymous" };
  }
}

function requireRole(required: AuthContext["role"], config: RuntimeConfig): express.RequestHandler {
  const rank: Record<AuthContext["role"], number> = { operator: 1, reviewer: 2, admin: 3 };
  return async (req, res, next) => {
    try {
      const auth = await getVerifiedAuth(req, config);
      if (rank[auth.role] < rank[required]) {
        recordOpsError("auth_failed", "Role check denied", {
          route: `${req.method} ${req.path}`,
          requiredRole: required,
          actualRole: auth.role,
          userId: auth.userId,
        });
        return res.status(403).json({ error: "Forbidden", requiredRole: required, actualRole: auth.role });
      }
      return next();
    } catch (error: any) {
      recordOpsError("auth_failed", String(error?.message || error), {
        route: `${req.method} ${req.path}`,
        requiredRole: required,
      });
      return res.status(401).json({ error: String(error?.message || error) });
    }
  };
}

function requireApiAuth(config: RuntimeConfig): express.RequestHandler {
  return async (req, res, next) => {
    if (!config.auth.enabled) {
      return res.status(500).json({ error: "API auth is not configured", authImplementation: config.auth.implementation });
    }
    try {
      await getVerifiedAuth(req, config);
      return next();
    } catch (error: any) {
      recordOpsError("auth_failed", String(error?.message || error), {
        route: `${req.method} ${req.path}`,
      });
      return res.status(401).json({ error: String(error?.message || error), authImplementation: config.auth.implementation });
    }
  };
}

function handleRouteError(res: express.Response, _config: RuntimeConfig, error: unknown, route: string, actor?: RequestActor) {
  const message = String((error as any)?.message || error);
  const requestId = String((res.locals as any)?.requestId || "unknown");
  const occurredAt = now();
  routeErrorCount += 1;
  updateTelemetryTimestamp();
  recordOpsError("route_error", message, { route, actorId: actor?.actorId || "unknown", requestId, workerId, runtimeMode: _config.runtimeMode });
  void emitRouteErrorAlert(_config, {
    category: "route_error",
    route,
    message,
    requestId,
    actorId: actor?.actorId || "unknown",
    timestamp: occurredAt,
  });
  console.error(JSON.stringify({ event: "route_error", route, actorId: actor?.actorId || "unknown", message, workerId, requestId, timestamp: occurredAt }));
  return res.status(500).json({ error: message, workerId, requestId });
}

type RouteErrorAlertPayload = {
  category: "route_error";
  route: string;
  message: string;
  requestId: string;
  actorId: string;
  timestamp: string;
};

async function emitRouteErrorAlert(config: RuntimeConfig, payload: RouteErrorAlertPayload): Promise<void> {
  if (!config.alertWebhookUrl) {
    return;
  }

  const summaryText = `Botomatic alert: ${payload.category} ${payload.route} ${payload.requestId} [${config.runtimeMode}] at ${payload.timestamp}`;
  const body = {
    text: summaryText,
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*Botomatic Alert*\n*Category:* ${payload.category}\n*Route:* ${payload.route}\n*Request ID:* ${payload.requestId}\n*Runtime Mode:* ${config.runtimeMode}\n*Timestamp:* ${payload.timestamp}\n*Message:* ${payload.message}`,
        },
      },
    ],
  };

  try {
    const response = await fetch(config.alertWebhookUrl, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(3000),
    });
    if (!response.ok) {
      throw new Error(`Alert sink responded ${response.status}`);
    }
    alertDeliverySuccessCount += 1;
    updateTelemetryTimestamp();
  } catch (error: any) {
    alertDeliveryFailureCount += 1;
    recordOpsError("alert_delivery_failed", String(error?.message || error), {
      route: payload.route,
      requestId: payload.requestId,
      runtimeMode: config.runtimeMode,
      sinkConfigured: true,
    });
  }
}

function getPackets(project: StoredProjectRecord): any[] {
  const plan = (project.plan || {}) as any;
  return Array.isArray(plan.packets) ? plan.packets : [];
}

function ensureDeploymentState(project: any) {
  const runs = ((project.runs || {}) as Record<string, unknown>);
  const fromRuns = runs[deploymentStateRunKey] as Record<string, any> | undefined;
  const deployments = project.deployments || fromRuns || {
    dev: { environment: "dev", status: "idle" },
    staging: { environment: "staging", status: "idle" },
    prod: { environment: "prod", status: "idle" },
  };
  project.deployments = deployments;
  project.runs = { ...runs, [deploymentStateRunKey]: deployments };
}

function ensureAudit(project: any) {
  if (!project.auditEvents) {
    project.auditEvents = [];
  }
}

function getIntakeArtifacts(project: StoredProjectRecord): Record<string, any> {
  const fromProject = ((project as any).intakeArtifacts || null) as Record<string, any> | null;
  if (fromProject && typeof fromProject === "object") {
    return fromProject;
  }
  const runs = ((project.runs || {}) as Record<string, unknown>);
  const fromRuns = runs[intakeArtifactsRunKey] as Record<string, any> | undefined;
  return fromRuns && typeof fromRuns === "object" ? fromRuns : {};
}

function setIntakeArtifacts(project: StoredProjectRecord, artifacts: Record<string, any>) {
  const runs = ((project.runs || {}) as Record<string, unknown>);
  project.runs = { ...runs, [intakeArtifactsRunKey]: artifacts };
  (project as any).intakeArtifacts = artifacts;
}

function getMasterSpec(project: StoredProjectRecord): MasterSpec | null {
  const runs = ((project.runs || {}) as Record<string, unknown>);
  const value = runs[specStateRunKey] as MasterSpec | undefined;
  return value || null;
}

function setMasterSpec(project: StoredProjectRecord, spec: MasterSpec) {
  const runs = ((project.runs || {}) as Record<string, unknown>);
  project.runs = { ...runs, [specStateRunKey]: spec };
}

function getSpecClarifications(project: StoredProjectRecord): any[] {
  const runs = ((project.runs || {}) as Record<string, unknown>);
  const value = runs[specClarificationsRunKey] as any[] | undefined;
  return Array.isArray(value) ? value : [];
}

function setSpecClarifications(project: StoredProjectRecord, clarifications: any[]) {
  const runs = ((project.runs || {}) as Record<string, unknown>);
  project.runs = { ...runs, [specClarificationsRunKey]: clarifications };
}

function getBuildContract(project: StoredProjectRecord): BuildContract | null {
  const runs = ((project.runs || {}) as Record<string, unknown>);
  const value = runs[buildContractRunKey] as BuildContract | undefined;
  return value || null;
}

function setBuildContract(project: StoredProjectRecord, contract: BuildContract) {
  const runs = ((project.runs || {}) as Record<string, unknown>);
  project.runs = { ...runs, [buildContractRunKey]: contract };
}

function mergeSpecWithExisting(existing: MasterSpec | null, next: MasterSpec): MasterSpec {
  if (!existing) return next;

  const approvedAssumptions = new Set(
    (existing.assumptions || [])
      .filter((a: any) => a?.approved)
      .map((a: any) => `${String(a?.field || "").toLowerCase()}::${String(a?.decision || "").toLowerCase()}`)
  );

  const assumptions = (next.assumptions || []).map((assumption: any) => {
    const key = `${String(assumption?.field || "").toLowerCase()}::${String(assumption?.decision || "").toLowerCase()}`;
    if (approvedAssumptions.has(key)) {
      return { ...assumption, approved: true };
    }
    return assumption;
  });

  const recommendationStatusByArea = new Map(
    (existing.recommendations || []).map((r: any) => [String(r?.area || "").toLowerCase(), r?.status])
  );
  const recommendations = (next.recommendations || []).map((rec: any) => {
    const prior = recommendationStatusByArea.get(String(rec?.area || "").toLowerCase());
    if (prior === "accepted" || prior === "rejected") {
      return { ...rec, status: prior };
    }
    return rec;
  });

  return { ...next, assumptions, recommendations };
}

function emitEvent(project: any, event: any) {
  ensureAudit(project);
  project.auditEvents.unshift(event);
  if (event?.type === "promote") {
    promotionCount += 1;
    updateTelemetryTimestamp();
  }
}

async function getQueueDepth(config: RuntimeConfig): Promise<number> {
  if (config.repository.mode !== "durable") return 0;
  try {
    const stats = await getQueueStats();
    return Number(stats.queued || 0);
  } catch {
    return 0;
  }
}

async function buildOpsQueue(config: RuntimeConfig) {
  const queueDepth = await getQueueDepth(config);
  return {
    queueDepth,
    activeWorkers,
    workerConcurrency,
    leaseMs,
    workerId,
    queueMode: "dedicated_jobs_table_parallel",
    repositoryMode: config.repository.mode,
    lastUpdatedAt: telemetryUpdatedAt,
  };
}

async function buildOpsMetrics(config: RuntimeConfig) {
  const queueDepth = await getQueueDepth(config);
  return {
    queueDepth,
    activeWorkers,
    workerConcurrency,
    packetSuccessCount,
    packetFailureCount,
    validationPassCount,
    validationFailCount,
    promotionCount,
    routeErrorCount,
    alertDeliverySuccessCount,
    alertDeliveryFailureCount,
    alertSinkConfigured: Boolean(config.alertWebhookUrl),
    repositoryMode: config.repository.mode,
    lastUpdatedAt: telemetryUpdatedAt,
  };
}

function recomputeProjectStatus(project: StoredProjectRecord) {
  const packets = getPackets(project);
  if (packets.length === 0) return (project.status = "queued");
  if (packets.every((packet: any) => packet.status === "complete")) return (project.status = "complete");
  if (packets.some((packet: any) => packet.status === "executing")) return (project.status = "executing");
  if (packets.some((packet: any) => packet.status === "pending")) return (project.status = "queued");
  if (packets.some((packet: any) => packet.status === "blocked" || packet.status === "failed")) return (project.status = "blocked");
  project.status = "queued";
}

function setPacketStatus(project: StoredProjectRecord, packetId: string, status: string) {
  const plan = (project.plan || {}) as any;
  const packets = getPackets(project);
  project.plan = { ...plan, packets: packets.map((packet: any) => packet.packetId === packetId ? { ...packet, status, updatedAt: now() } : packet) };
}

function getPacket(project: StoredProjectRecord, packetId: string) {
  return getPackets(project).find((packet: any) => packet.packetId === packetId) || null;
}

function getNextPendingPacket(project: StoredProjectRecord) {
  return getPackets(project).find((packet: any) => packet.status === "pending") || null;
}

function getRepairablePackets(project: StoredProjectRecord) {
  const packets = getPackets(project);
  const gitResults = (project.gitResults || {}) as Record<string, GitOperationResult>;
  return packets.filter((packet: any) => packet.status === "blocked" && gitResults[`${packet.packetId}:commit_files`]?.status === "failed");
}

function ensureGitOperation(project: StoredProjectRecord, input: { packetId: string; type: "create_branch" | "commit_files" | "open_pull_request"; branchName?: string; title?: string; body?: string; }): GitOperationRequest {
  const operationId = `${input.packetId}:${input.type}`;
  const existing = ((project.gitOperations || {}) as Record<string, GitOperationRequest>)[operationId];
  if (existing) return existing;
  const created = createGitOperation({ operationId, projectId: project.projectId, packetId: input.packetId, type: input.type, branchName: input.branchName, title: input.title, body: input.body });
  project.gitOperations = { ...((project.gitOperations || {}) as Record<string, GitOperationRequest>), [operationId]: created };
  return created;
}

function setGitOperationStatus(project: StoredProjectRecord, operationId: string, status: GitOperationRequest["status"]) {
  const operations = { ...((project.gitOperations || {}) as Record<string, GitOperationRequest>) };
  const op = operations[operationId];
  if (!op) return;
  operations[operationId] = { ...op, status, updatedAt: now() };
  project.gitOperations = operations;
}

function setGitOperationResult(project: StoredProjectRecord, result: GitOperationResult) {
  project.gitResults = { ...((project.gitResults || {}) as Record<string, GitOperationResult>), [result.operationId]: result };
}

function getGitOperationResult(project: StoredProjectRecord, operationId: string) {
  return ((project.gitResults || {}) as Record<string, GitOperationResult>)[operationId] || null;
}

function clearReplayState(project: StoredProjectRecord, packetId: string) {
  const operationKeys = [`${packetId}:commit_files`, `${packetId}:open_pull_request`];
  const gitResults = { ...((project.gitResults || {}) as Record<string, GitOperationResult>) };
  for (const key of operationKeys) delete gitResults[key];
  project.gitResults = gitResults;
  const gitOperations = { ...((project.gitOperations || {}) as Record<string, GitOperationRequest>) };
  for (const key of operationKeys) {
    const op = gitOperations[key];
    if (op) gitOperations[key] = { ...op, status: "pending", updatedAt: now() };
  }
  project.gitOperations = gitOperations;
}

function validateChangedFiles(changedFiles: ChangedFile[]) {
  return changedFiles.map((file, index) => {
    if (!file?.path || typeof file.body !== "string") {
      throw new Error(`Executor returned invalid changed file payload: ${JSON.stringify({ index, path: file?.path ?? null, hasBody: typeof file?.body === "string" })}`);
    }
    return { path: file.path, content: file.body };
  });
}

async function persistProject(config: RuntimeConfig, project: StoredProjectRecord) {
  ensureGovernanceApprovalState(project);
  (project as any).updatedAt = now();
  await config.repository.repo.upsertProject(project);
}

function buildOverview(project: StoredProjectRecord) {
  const packets = getPackets(project);
  const completedPackets = packets.filter((packet: any) => packet.status === "complete").length;
  const failedPackets = packets.filter((packet: any) => packet.status === "blocked" || packet.status === "failed").length;
  const latestValidation = project.validations ? Object.values(project.validations as Record<string, any>).slice(-1)[0] : null;
  const gitResults = (project.gitResults || {}) as Record<string, GitOperationResult>;
  const latestPr = Object.values(gitResults).find((result: any) => result?.prUrl);
  const blockers: string[] = [];
  if (!project.masterTruth) blockers.push("Compile has not completed.");
  if (!project.plan) blockers.push("Plan has not completed.");
  if (failedPackets > 0) blockers.push(`${failedPackets} packet${failedPackets === 1 ? " is" : "s are"} blocked or failed.`);
  if (!latestValidation) blockers.push("Validation has not run.");
  return {
    project: { id: project.projectId, name: project.name, environment: "commercial" },
    latestRun: { id: project.projectId, status: project.status || "idle", currentStage: project.status || null, startedAt: (project as any).createdAt || null, updatedAt: (project as any).updatedAt || null },
    summary: { compiled: Boolean(project.masterTruth), planned: Boolean(project.plan), packetCount: packets.length, completedPackets, failedPackets, pendingApprovals: 0 },
    readiness: { status: latestValidation ? (blockers.length ? "blocked" : "ready") : "not_started", score: latestValidation ? (blockers.length ? 6.5 : 8.0) : null, topIssues: blockers.slice(0, 3) },
    activity: [{ id: `evt_${project.projectId}`, type: "project_status", label: `Project status is ${project.status || "idle"}`, timestamp: (project as any).updatedAt || now() }],
    latestArtifact: { pullRequestUrl: (latestPr as any)?.prUrl || null, changedFiles: Object.keys(gitResults).length, previewUrl: null },
    blockers,
  };
}

function buildGate(project: StoredProjectRecord) {
  const overview = buildOverview(project);
  const governanceApproval = getGovernanceApprovalState(project);
  const governanceIssues = validateGovernanceForAction(governanceApproval, "Launch");
  const issues = [...overview.blockers, ...governanceIssues];
  const approvalStatus = governanceApproval.approvalStatus;
  const launchStatus = overview.readiness.status === "ready" && issues.length === 0 ? "ready" : issues.length > 0 ? "blocked" : "not_started";
  return { launchStatus, approvalStatus, governanceApproval, issues };
}

function buildIntakeContext(project: StoredProjectRecord): string {
  const intakeArtifacts = getIntakeArtifacts(project);
  const values = Object.values(intakeArtifacts || {});
  if (!values.length) return "";
  return values
    .map((a: any) => `[Uploaded: ${a.fileName}]\n${a.extractedText || a.extractedTextPreview || ""}`)
    .join("\n\n");
}

function compileProjectWithIntake(project: StoredProjectRecord): StoredProjectRecord {
  const intakeContext = buildIntakeContext(project);
  const enrichedRequest = intakeContext
    ? `${project.request}\n\n--- Uploaded Specs ---\n${intakeContext}`
    : project.request;
  const blueprint = matchBlueprintFromText(enrichedRequest);
  const truth = compileConversationToMasterTruth({
    projectId: project.projectId,
    appName: project.name,
    request: enrichedRequest,
  });
  const analyzed = analyzeSpec({
    appName: project.name,
    request: enrichedRequest,
    blueprint,
    actorId: "system",
  });
  const mergedSpec = mergeSpecWithExisting(getMasterSpec(project), analyzed.spec);
  const spec: MasterSpec = {
    ...mergedSpec,
    appType: analyzed.spec.appType || blueprint.category,
    pages: mergedSpec.pages.length > 0 ? mergedSpec.pages : blueprint.defaultPages,
    components: mergedSpec.components.length > 0 ? mergedSpec.components : blueprint.defaultComponents,
    roles: mergedSpec.roles.length > 0 ? mergedSpec.roles : blueprint.defaultRoles,
    permissions: mergedSpec.permissions.length > 0 ? mergedSpec.permissions : blueprint.defaultPermissions,
    dataEntities: mergedSpec.dataEntities.length > 0 ? mergedSpec.dataEntities : blueprint.defaultEntities,
    relationships: mergedSpec.relationships.length > 0 ? mergedSpec.relationships : blueprint.defaultRelationships,
    workflows: mergedSpec.workflows.length > 0 ? mergedSpec.workflows : blueprint.defaultWorkflows,
    integrations: mergedSpec.integrations.length > 0 ? mergedSpec.integrations : blueprint.defaultIntegrations,
  };

  (truth as any).canonicalSpec = {
    ...((truth as any).canonicalSpec || {}),
    productIntent: spec.coreOutcome,
    users: spec.targetUsers,
    pages: spec.pages,
    workflows: spec.workflows,
    dataModel: spec.dataEntities,
    integrations: spec.integrations,
    acceptanceCriteria: spec.acceptanceCriteria,
    openQuestions: spec.openQuestions,
  };

  const runs = ((project.runs || {}) as Record<string, unknown>);
  return {
    ...project,
    masterTruth: truth,
    status: (truth as any).status,
    runs: {
      ...runs,
      [specStateRunKey]: spec,
      [specClarificationsRunKey]: analyzed.clarifications,
      [specStyleRunKey]: analyzed.style,
    },
    updatedAt: now(),
  } as StoredProjectRecord;
}

function getBuildBlockers(project: StoredProjectRecord): string[] {
  const spec = getMasterSpec(project);
  if (!spec) {
    return ["Spec analysis is missing. Run spec analysis before planning."];
  }
  const contract = getBuildContract(project);
  const block = computeBuildBlockStatus(spec, Boolean(contract), false);
  const contractReady = contract?.readyToBuild && Boolean(contract?.approvedAt);
  const blockers = [...block.blockers];
  if (!contractReady) {
    blockers.push("Build contract is not approved and ready.");
  }
  return Array.from(new Set(blockers));
}

function hasLaunchIntent(message: string): boolean {
  const lower = message.toLowerCase();
  return /(launch|go live|promote|deploy\s+prod|release)/.test(lower);
}

function hasRuntimeProofCaptureIntent(message: string): boolean {
  const lower = message.toLowerCase();
  return /(capture runtime proof|runtime proof captured|proof captured)/.test(lower);
}

function hasGovernanceApproveIntent(message: string): boolean {
  const lower = message.toLowerCase();
  return /(approve governance|governance approved|approve launch|approval approved)/.test(lower);
}

function formatOperatorVoice(input: {
  direct: string;
  status: string;
  blockers: string[];
  nextAction: string;
}) {
  const blockerText = input.blockers.length > 0 ? input.blockers.join("; ") : "none";
  return [
    `Direct: ${input.direct}`,
    `Status: ${input.status}`,
    `Exact blockers: ${blockerText}`,
    `Exact next action: ${input.nextAction}`,
  ].join("\n");
}

function hasMissingValidation(project: StoredProjectRecord): boolean {
  const packets = getPackets(project);
  const validations = (project.validations || {}) as Record<string, unknown>;
  return packets.some((packet: any) => packet.status === "complete" && !validations[packet.packetId]);
}

function hasUncompiledIntake(project: StoredProjectRecord): boolean {
  const intakeArtifacts = Object.values(getIntakeArtifacts(project) || {});
  if (intakeArtifacts.length === 0) return false;
  if (!project.masterTruth) return true;
  const compiledAt = Date.parse(String((project.masterTruth as any)?.updatedAt || (project as any).updatedAt || 0));
  return intakeArtifacts.some((artifact: any) => Date.parse(String(artifact?.uploadedAt || 0)) > compiledAt);
}

function roleRank(role: AuthContext["role"]): number {
  if (role === "admin") return 3;
  if (role === "reviewer") return 2;
  return 1;
}

function buildPacketList(project: StoredProjectRecord) {
  return getPackets(project).map((p: any) => ({ packetId: p.packetId, status: p.status, goal: p.goal, branchName: p.branchName }));
}

function buildArtifactList(project: StoredProjectRecord) {
  return Object.values(project.gitResults || {}).map((r: any) => ({ operationId: r.operationId, status: r.status, branchName: r.branchName, prUrl: r.prUrl || null, error: r.error || null }));
}

async function runGitHubLifecycle(config: RuntimeConfig, project: StoredProjectRecord, packet: any, changedFiles: ChangedFile[]) {
  const gh = getGitHub();
  const branchOp = ensureGitOperation(project, { packetId: packet.packetId, type: "create_branch", branchName: packet.branchName });
  if (!getGitOperationResult(project, branchOp.operationId)?.status || getGitOperationResult(project, branchOp.operationId)?.status === "failed") {
    setGitOperationStatus(project, branchOp.operationId, "submitted");
    await persistProject(config, project);
    try {
      const baseSha = await gh.getDefaultBranchSha();
      await gh.createBranch(packet.branchName, baseSha);
      setGitOperationStatus(project, branchOp.operationId, "succeeded");
      setGitOperationResult(project, { operationId: branchOp.operationId, status: "succeeded", branchName: packet.branchName, updatedAt: now() } as GitOperationResult);
    } catch (error: any) {
      const message = String(error?.message || error);
      if (message.includes("Reference already exists")) {
        setGitOperationStatus(project, branchOp.operationId, "succeeded");
        setGitOperationResult(project, { operationId: branchOp.operationId, status: "succeeded", branchName: packet.branchName, updatedAt: now() } as GitOperationResult);
      } else {
        setGitOperationStatus(project, branchOp.operationId, "failed");
        setGitOperationResult(project, { operationId: branchOp.operationId, status: "failed", branchName: packet.branchName, error: message, updatedAt: now() } as GitOperationResult);
        await persistProject(config, project);
        throw error;
      }
    }
    await persistProject(config, project);
  }

  const commitOp = ensureGitOperation(project, { packetId: packet.packetId, type: "commit_files", branchName: packet.branchName, title: `Packet ${packet.packetId}` });
  if (!getGitOperationResult(project, commitOp.operationId)?.status || getGitOperationResult(project, commitOp.operationId)?.status === "failed") {
    setGitOperationStatus(project, commitOp.operationId, "submitted");
    await persistProject(config, project);
    try {
      const validatedFiles = validateChangedFiles(changedFiles);
      const commit = await gh.commitFiles(packet.branchName, `Packet ${packet.packetId}`, validatedFiles);
      setGitOperationStatus(project, commitOp.operationId, "succeeded");
      setGitOperationResult(project, { operationId: commitOp.operationId, status: "succeeded", branchName: packet.branchName, commitSha: (commit as any).sha, updatedAt: now() } as GitOperationResult);
    } catch (error: any) {
      setGitOperationStatus(project, commitOp.operationId, "failed");
      setGitOperationResult(project, { operationId: commitOp.operationId, status: "failed", branchName: packet.branchName, error: String(error?.message || error), updatedAt: now() } as GitOperationResult);
      await persistProject(config, project);
      throw error;
    }
    await persistProject(config, project);
  }

  const prOp = ensureGitOperation(project, { packetId: packet.packetId, type: "open_pull_request", branchName: packet.branchName, title: `Packet ${packet.packetId}` });
  if (!getGitOperationResult(project, prOp.operationId)?.status || getGitOperationResult(project, prOp.operationId)?.status === "failed") {
    setGitOperationStatus(project, prOp.operationId, "submitted");
    await persistProject(config, project);
    try {
      const pr = await gh.createPullRequest(`Packet ${packet.packetId}`, packet.branchName);
      setGitOperationStatus(project, prOp.operationId, "succeeded");
      setGitOperationResult(project, { operationId: prOp.operationId, status: "succeeded", branchName: packet.branchName, prUrl: (pr as any).html_url, updatedAt: now() } as GitOperationResult);
    } catch (error: any) {
      setGitOperationStatus(project, prOp.operationId, "failed");
      setGitOperationResult(project, { operationId: prOp.operationId, status: "failed", branchName: packet.branchName, error: String(error?.message || error), updatedAt: now() } as GitOperationResult);
      await persistProject(config, project);
      throw error;
    }
    await persistProject(config, project);
  }
}

async function processJob(config: RuntimeConfig, job: QueueJobRecord) {
  const project = await config.repository.repo.getProject(job.project_id);
  if (!project) {
    await finalizeJob(job.job_id, "failed", `Project not found: ${job.project_id}`);
    return;
  }
  const packet = getPacket(project, job.packet_id);
  if (!packet) {
    await finalizeJob(job.job_id, "failed", `Packet not found: ${job.packet_id}`);
    return;
  }

  if (["executing", "blocked", "failed", "complete"].includes(String(packet.status))) {
    await finalizeJob(job.job_id, "failed", `Duplicate or stale job ignored for packet ${packet.packetId} with status ${packet.status}`);
    return;
  }

  setPacketStatus(project, packet.packetId, "executing");
  recomputeProjectStatus(project);
  emitEvent(project as any, { id: `evt_${Date.now()}`, projectId: project.projectId, type: "execute_packet", actorId: workerId, role: "system", timestamp: now(), metadata: { packetId: packet.packetId } });
  await persistProject(config, project);

  try {
    const executor = getExecutor();
    const result = await executor.execute({ projectId: project.projectId, packetId: packet.packetId, branchName: packet.branchName, goal: packet.goal, requirements: packet.requirements, constraints: packet.constraints });
    if (!result.success) {
      packetFailureCount += 1;
      recordOpsError("packet_failed", String((result as any).summary || "Executor returned unsuccessful result"), {
        projectId: project.projectId,
        packetId: packet.packetId,
      });
      const failedState = markPacketFailed({ projectId: project.projectId, status: project.status as any, packets: getPackets(project), runs: project.runs as any }, packet.packetId);
      project.plan = { ...((project.plan as any) || {}), packets: (failedState as any).packets };
      project.runs = (failedState as any).runs || project.runs;
      recomputeProjectStatus(project);
      emitEvent(project as any, { id: `evt_${Date.now()}`, projectId: project.projectId, type: "packet_failed", actorId: workerId, role: "system", timestamp: now(), metadata: { packetId: packet.packetId, summary: (result as any).summary } });
      await persistProject(config, project);
      await finalizeJob(job.job_id, "failed", (result as any).summary);
      return;
    }

    await runGitHubLifecycle(config, project, packet, (result as any).changedFiles as ChangedFile[]);
    const validation = runValidation(project.projectId, packet.packetId);
    if ((validation as any).status === "passed") {
      validationPassCount += 1;
      packetSuccessCount += 1;
    } else {
      validationFailCount += 1;
      packetFailureCount += 1;
      recordOpsError("packet_failed", "Validation returned non-passed status", {
        projectId: project.projectId,
        packetId: packet.packetId,
        status: (validation as any).status,
      });
    }
    updateTelemetryTimestamp();
    project.validations = { ...((project.validations || {}) as Record<string, unknown>), [packet.packetId]: validation };
    emitEvent(project as any, { id: `evt_${Date.now()}`, projectId: project.projectId, type: "validation", actorId: workerId, role: "system", timestamp: now(), metadata: { packetId: packet.packetId } });
    const completedState = markPacketComplete({ projectId: project.projectId, status: project.status as any, packets: getPackets(project), runs: project.runs as any }, packet.packetId);
    project.plan = { ...((project.plan as any) || {}), packets: (completedState as any).packets };
    project.runs = (completedState as any).runs || project.runs;
    recomputeProjectStatus(project);
    await persistProject(config, project);
    await finalizeJob(job.job_id, "succeeded");
  } catch (error: any) {
    packetFailureCount += 1;
    recordOpsError("packet_failed", String(error?.message || error), {
      projectId: project.projectId,
      packetId: packet.packetId,
    });
    const failedState = markPacketFailed({ projectId: project.projectId, status: project.status as any, packets: getPackets(project), runs: project.runs as any }, packet.packetId);
    project.plan = { ...((project.plan as any) || {}), packets: (failedState as any).packets };
    project.runs = (failedState as any).runs || project.runs;
    recomputeProjectStatus(project);
    emitEvent(project as any, { id: `evt_${Date.now()}`, projectId: project.projectId, type: "packet_failed", actorId: workerId, role: "system", timestamp: now(), metadata: { packetId: packet.packetId, error: String(error?.message || error) } });
    await persistProject(config, project);
    await finalizeJob(job.job_id, "failed", String(error?.message || error));
  }
}

async function workerTick(config: RuntimeConfig) {
  if (activeWorkers >= workerConcurrency) return;
  const availableSlots = workerConcurrency - activeWorkers;
  const claims = await Promise.all(Array.from({ length: availableSlots }, () => claimJob(workerId, leaseMs)));
  const jobs = claims.filter(Boolean) as QueueJobRecord[];
  for (const job of jobs) {
    activeWorkers += 1;
    void processJob(config, job).catch((error: any) => {
      console.error(JSON.stringify({ event: "queue_worker_error", workerId, message: String(error?.message || error), timestamp: now() }));
    }).finally(() => {
      activeWorkers -= 1;
    });
  }
}

function startQueueWorker(config: RuntimeConfig) {
  if (workerStarted) return;
  workerStarted = true;
  setInterval(() => { void workerTick(config); }, Number(process.env.QUEUE_POLL_INTERVAL_MS || 2000));
}

export function buildApp(config: RuntimeConfig) {
  const app = express();
  const repo = config.repository.repo;
  if (config.repository.mode === "durable") {
    startQueueWorker(config);
  }
  app.use(express.json());
  app.use((req, res, next) => {
    const requestId = req.header("x-request-id") || makeRequestId();
    (res.locals as any).requestId = requestId;
    res.setHeader("x-request-id", requestId);
    next();
  });

  app.get("/api/health", async (req, res) => {
    try {
      const auth = await getVerifiedAuth(req, config);
      return res.json({ status: "ok", appName: config.appName, runtimeMode: config.runtimeMode, repositoryMode: config.repository.mode, repositoryImplementation: config.repository.implementation, durableEnvPresent: config.durableEnvPresent, authEnabled: config.auth.enabled, authImplementation: config.auth.implementation, commitSha: config.commitSha, startupTimestamp: config.startupTimestamp, queueEnabled: config.repository.mode === "durable", activeWorkers, workerConcurrency, workerId, leaseMs, queueMode: "dedicated_jobs_table_parallel", role: auth.role, userId: auth.userId, issuer: auth.issuer || null, requestId: (res.locals as any).requestId });
    } catch {
      return res.json({ status: "ok", appName: config.appName, runtimeMode: config.runtimeMode, repositoryMode: config.repository.mode, repositoryImplementation: config.repository.implementation, durableEnvPresent: config.durableEnvPresent, authEnabled: config.auth.enabled, authImplementation: config.auth.implementation, commitSha: config.commitSha, startupTimestamp: config.startupTimestamp, queueEnabled: config.repository.mode === "durable", activeWorkers, workerConcurrency, workerId, leaseMs, queueMode: "dedicated_jobs_table_parallel", role: null, userId: null, issuer: null, requestId: (res.locals as any).requestId });
    }
  });

  app.use("/api/ops", requireApiAuth(config));

  app.get("/api/ops/metrics", requireRole("reviewer", config), async (req, res) => {
    const actor = await getRequestActor(req, config);
    try {
      const metrics = await buildOpsMetrics(config);
      return res.json({ ...metrics, actorId: actor.actorId, requestId: (res.locals as any).requestId });
    } catch (error) {
      return handleRouteError(res, config, error, "GET /api/ops/metrics", actor);
    }
  });

  app.get("/api/ops/errors", requireRole("reviewer", config), async (req, res) => {
    const actor = await getRequestActor(req, config);
    try {
      return res.json({
        errors: recentOpsErrors.slice(0, 100),
        count: recentOpsErrors.length,
        actorId: actor.actorId,
        requestId: (res.locals as any).requestId,
      });
    } catch (error) {
      return handleRouteError(res, config, error, "GET /api/ops/errors", actor);
    }
  });

  app.get("/api/ops/queue", requireRole("reviewer", config), async (req, res) => {
    const actor = await getRequestActor(req, config);
    try {
      const queue = await buildOpsQueue(config);
      return res.json({ ...queue, actorId: actor.actorId, requestId: (res.locals as any).requestId });
    } catch (error) {
      return handleRouteError(res, config, error, "GET /api/ops/queue", actor);
    }
  });

  app.use("/api/projects", requireApiAuth(config));

  app.post("/api/projects/intake", async (req, res) => {
    const actor = await getRequestActor(req, config);
    try {
      const { name, request } = req.body;
      const projectId = `proj_${Date.now()}`;
      const project = toStored({ projectId, name, request, status: "clarifying", governanceApproval: buildDefaultGovernanceApproval(actor.actorId) });
      ensureGovernanceApprovalState(project, actor.actorId);
      const blueprint = matchBlueprintFromText(request || name || "");
      const analyzed = analyzeSpec({ appName: name, request: String(request || ""), blueprint, actorId: actor.actorId });
      setMasterSpec(project, analyzed.spec);
      setSpecClarifications(project, analyzed.clarifications);
      project.runs = { ...((project.runs || {}) as Record<string, unknown>), [specStyleRunKey]: analyzed.style };
      emitEvent(project as any, { id: `evt_${Date.now()}`, projectId, type: "intake", actorId: actor.actorId, timestamp: now(), metadata: { name } });
      await repo.upsertProject(project);
      return res.json({ projectId, status: project.status, actorId: actor.actorId });
    } catch (error) {
      return handleRouteError(res, config, error, "POST /api/projects/intake", actor);
    }
  });

  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB max
    fileFilter: (_req, file, cb) => {
      const allowed = ["text/plain", "text/markdown", "application/json", "text/csv", "application/pdf"];
      if (allowed.includes(file.mimetype) || file.originalname.match(/\.(txt|md|json|csv|pdf)$/i)) {
        cb(null, true);
      } else {
        cb(new Error(`Unsupported file type: ${file.mimetype}`));
      }
    },
  });

  app.post("/api/projects/:projectId/intake/file", (req, res, next) => {
    upload.single("file")(req, res, (error: any) => {
      if (!error) {
        return next();
      }
      if (error instanceof multer.MulterError) {
        if (error.code === "LIMIT_FILE_SIZE") {
          return res.status(400).json({ error: "File too large. Max size is 10 MB." });
        }
        return res.status(400).json({ error: `Upload failed: ${error.code}` });
      }
      return res.status(400).json({ error: String(error?.message || error) });
    });
  }, async (req, res) => {
    const actor = await getRequestActor(req, config);
    try {
      const project = await repo.getProject(req.params.projectId);
      if (!project) return res.status(404).json({ error: "Project not found" });

      const uploadedFile = (req as any).file as Express.Multer.File | undefined;
      if (!uploadedFile) return res.status(400).json({ error: "No file uploaded" });

      const MAX_EXTRACT_BYTES = 500_000;
      const CHUNK_SIZE = 4000;
      const sizeBytes = uploadedFile.size;
      const fileName = uploadedFile.originalname;
      const mimeType = uploadedFile.mimetype;
      const uploadedAt = now();

      let extractedText = "";
      let parseError: string | null = null;

      if (mimeType === "application/pdf" || fileName.toLowerCase().endsWith(".pdf")) {
        try {
          const parser = new PDFParse({ data: uploadedFile.buffer });
          const pdfData = await parser.getText();
          await parser.destroy();
          extractedText = pdfData.text || "";
        } catch (err: any) {
          parseError = `PDF parse failed: ${String(err?.message || err)}`;
          extractedText = "";
        }
      } else {
        try {
          extractedText = uploadedFile.buffer.toString("utf8");
        } catch (err: any) {
          parseError = `Text decode failed: ${String(err?.message || err)}`;
          extractedText = "";
        }
      }

      const truncated = extractedText.length > MAX_EXTRACT_BYTES;
      const fullText = truncated ? extractedText.slice(0, MAX_EXTRACT_BYTES) : extractedText;
      const extractedTextPreview = fullText.slice(0, 500);

      const chunks: string[] = [];
      for (let i = 0; i < fullText.length; i += CHUNK_SIZE) {
        chunks.push(fullText.slice(i, i + CHUNK_SIZE));
      }

      const artifactId = `intake_file_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const artifact = {
        artifactId,
        fileName,
        mimeType,
        sizeBytes,
        uploadedAt,
        actorId: actor.actorId,
        extractedTextPreview,
        extractedText: fullText,
        truncated,
        chunkCount: chunks.length,
        chunkPreviews: chunks.slice(0, 3).map((c, i) => ({ index: i, preview: c.slice(0, 200) })),
        parseError,
      };

      const existingIntake = getIntakeArtifacts(project);
      setIntakeArtifacts(project, { ...existingIntake, [artifactId]: artifact });
      emitEvent(project as any, {
        id: `evt_${Date.now()}`,
        projectId: project.projectId,
        type: "intake_file",
        actorId: actor.actorId,
        timestamp: uploadedAt,
        metadata: { fileName, mimeType, sizeBytes, artifactId, extractedChars: fullText.length, truncated, parseError },
      });
      await persistProject(config, project);

      return res.json({
        ok: true,
        artifactId,
        fileName,
        mimeType,
        sizeBytes,
        extractedChars: fullText.length,
        extractedTextPreview,
        truncated,
        chunkCount: chunks.length,
        parseError,
        actorId: actor.actorId,
        message: parseError
          ? `Uploaded ${fileName}; parse error occurred; metadata stored.`
          : `Uploaded ${fileName}; extracted ${fullText.length} characters; available to planning.`,
      });
    } catch (error) {
      return handleRouteError(res, config, error, "POST /api/projects/:projectId/intake/file", actor);
    }
  });

  app.post("/api/projects/:projectId/spec/analyze", async (req, res) => {
    const actor = await getRequestActor(req, config);
    try {
      const project = await repo.getProject(req.params.projectId);
      if (!project) return res.status(404).json({ error: "Project not found" });
      const intakeContext = buildIntakeContext(project);
      const text = [project.request, intakeContext, String((req.body as any)?.message || "")].filter(Boolean).join("\n\n");
      const blueprint = matchBlueprintFromText(text);
      const analyzed = analyzeSpec({ appName: project.name, request: text, blueprint, actorId: actor.actorId });
      const mergedSpec = mergeSpecWithExisting(getMasterSpec(project), analyzed.spec);
      setMasterSpec(project, mergedSpec);
      setSpecClarifications(project, analyzed.clarifications);
      const runs = ((project.runs || {}) as Record<string, unknown>);
      project.runs = { ...runs, [specStyleRunKey]: analyzed.style };
      emitEvent(project as any, {
        id: `evt_${Date.now()}`,
        projectId: project.projectId,
        type: "spec_analyzed",
        actorId: actor.actorId,
        timestamp: now(),
        metadata: { style: analyzed.style, openQuestions: mergedSpec.openQuestions.length },
      });
      await persistProject(config, project);
      return res.json({
        ok: true,
        style: analyzed.style,
        readinessScore: mergedSpec.readinessScore,
        completeness: mergedSpec.completeness,
        openQuestions: mergedSpec.openQuestions,
        actorId: actor.actorId,
      });
    } catch (error) {
      return handleRouteError(res, config, error, "POST /api/projects/:projectId/spec/analyze", actor);
    }
  });

  app.post("/api/projects/:projectId/spec/clarify", async (req, res) => {
    const actor = await getRequestActor(req, config);
    try {
      const project = await repo.getProject(req.params.projectId);
      if (!project) return res.status(404).json({ error: "Project not found" });
      const spec = getMasterSpec(project);
      if (!spec) return res.status(404).json({ error: "Spec is missing. Analyze first." });
      const clarifications = getSpecClarifications(project);
      const grouped = {
        mustAsk: clarifications.filter((q: any) => q.mustAsk),
        approvalNeeded: clarifications.filter((q: any) => !q.mustAsk && q.requiresApproval),
        safeDefaults: clarifications.filter((q: any) => q.suggestedDefault),
      };
      return res.json({ ok: true, grouped, openQuestions: spec.openQuestions, actorId: actor.actorId });
    } catch (error) {
      return handleRouteError(res, config, error, "POST /api/projects/:projectId/spec/clarify", actor);
    }
  });

  app.post("/api/projects/:projectId/spec/assumptions/accept", async (req, res) => {
    const actor = await getRequestActor(req, config);
    try {
      const ids = Array.isArray((req.body as any)?.assumptionIds) ? ((req.body as any).assumptionIds as string[]) : [];
      const project = await repo.getProject(req.params.projectId);
      if (!project) return res.status(404).json({ error: "Project not found" });
      const spec = getMasterSpec(project);
      if (!spec) return res.status(404).json({ error: "Spec is missing. Analyze first." });

      const assumptions = approveAssumptions(spec.assumptions as SpecAssumption[], ids);
      const nextSpec: MasterSpec = { ...spec, assumptions };
      setMasterSpec(project, nextSpec);
      const existingContract = getBuildContract(project);
      if (existingContract) {
        setBuildContract(project, {
          ...existingContract,
          assumptions,
          updatedAt: now(),
        });
      }
      emitEvent(project as any, {
        id: `evt_${Date.now()}`,
        projectId: project.projectId,
        type: "assumptions_accepted",
        actorId: actor.actorId,
        timestamp: now(),
        metadata: { acceptedCount: ids.length },
      });
      await persistProject(config, project);
      return res.json({ ok: true, assumptions, actorId: actor.actorId });
    } catch (error) {
      return handleRouteError(res, config, error, "POST /api/projects/:projectId/spec/assumptions/accept", actor);
    }
  });

  app.post("/api/projects/:projectId/spec/recommendations/apply", async (req, res) => {
    const actor = await getRequestActor(req, config);
    try {
      const acceptedIds = Array.isArray((req.body as any)?.acceptedIds) ? ((req.body as any).acceptedIds as string[]) : [];
      const rejectedIds = Array.isArray((req.body as any)?.rejectedIds) ? ((req.body as any).rejectedIds as string[]) : [];
      const project = await repo.getProject(req.params.projectId);
      if (!project) return res.status(404).json({ error: "Project not found" });
      const spec = getMasterSpec(project);
      if (!spec) return res.status(404).json({ error: "Spec is missing. Analyze first." });
      const recommendations = applyRecommendationStatus(spec.recommendations as SpecRecommendation[], acceptedIds, rejectedIds);
      const nextSpec: MasterSpec = { ...spec, recommendations };
      setMasterSpec(project, nextSpec);
      emitEvent(project as any, {
        id: `evt_${Date.now()}`,
        projectId: project.projectId,
        type: "recommendations_applied",
        actorId: actor.actorId,
        timestamp: now(),
        metadata: { accepted: acceptedIds.length, rejected: rejectedIds.length },
      });
      await persistProject(config, project);
      return res.json({ ok: true, recommendations, actorId: actor.actorId });
    } catch (error) {
      return handleRouteError(res, config, error, "POST /api/projects/:projectId/spec/recommendations/apply", actor);
    }
  });

  app.post("/api/projects/:projectId/spec/build-contract", async (req, res) => {
    const actor = await getRequestActor(req, config);
    try {
      const project = await repo.getProject(req.params.projectId);
      if (!project) return res.status(404).json({ error: "Project not found" });
      const spec = getMasterSpec(project);
      if (!spec) return res.status(404).json({ error: "Spec is missing. Analyze first." });
      const contract = generateBuildContract(project.projectId, spec);
      setBuildContract(project, contract);
      emitEvent(project as any, {
        id: `evt_${Date.now()}`,
        projectId: project.projectId,
        type: "build_contract_generated",
        actorId: actor.actorId,
        timestamp: now(),
        metadata: { readyToBuild: contract.readyToBuild, blockerCount: contract.blockers.length },
      });
      await persistProject(config, project);
      return res.json({ ok: true, contract, actorId: actor.actorId });
    } catch (error) {
      return handleRouteError(res, config, error, "POST /api/projects/:projectId/spec/build-contract", actor);
    }
  });

  app.post("/api/projects/:projectId/spec/approve", requireRole("reviewer", config), async (req, res) => {
    const actor = await getRequestActor(req, config);
    try {
      const project = await repo.getProject(req.params.projectId);
      if (!project) return res.status(404).json({ error: "Project not found" });
      const contract = getBuildContract(project);
      if (!contract) return res.status(404).json({ error: "Build contract missing. Generate contract first." });
      if (!contract.readyToBuild) {
        return res.status(409).json({ error: "Build contract is not ready to approve", blockers: contract.blockers });
      }
      const approved = approveBuildContract(contract, actor.actorId);
      setBuildContract(project, approved);
      emitEvent(project as any, {
        id: `evt_${Date.now()}`,
        projectId: project.projectId,
        type: "build_contract_approved",
        actorId: actor.actorId,
        timestamp: now(),
        metadata: { approvedAt: approved.approvedAt },
      });
      await persistProject(config, project);
      return res.json({ ok: true, contract: approved, actorId: actor.actorId });
    } catch (error) {
      return handleRouteError(res, config, error, "POST /api/projects/:projectId/spec/approve", actor);
    }
  });

  app.get("/api/projects/:projectId/spec/status", async (req, res) => {
    const actor = await getRequestActor(req, config);
    try {
      const project = await repo.getProject(req.params.projectId);
      if (!project) return res.status(404).json({ error: "Project not found" });
      const spec = getMasterSpec(project);
      const contract = getBuildContract(project);
      const block = spec ? computeBuildBlockStatus(spec, Boolean(contract), false) : {
        blocked: true,
        blockers: ["Spec missing."],
        readiness: {
          criticalCompleteness: 0,
          commercialCompleteness: 0,
          implementationCompleteness: 0,
          launchCompleteness: 0,
          riskCompleteness: 0,
        },
        unresolvedHighRiskQuestions: 0,
        hasBuildContract: Boolean(contract),
        hasCriticalContradiction: false,
      };

      return res.json({
        ok: true,
        style: ((project.runs || {}) as Record<string, unknown>)[specStyleRunKey] || null,
        spec,
        clarifications: getSpecClarifications(project),
        contract,
        buildBlocked: block.blocked || !Boolean(contract?.approvedAt),
        blockers: block.blockers,
        readiness: block.readiness,
        actorId: actor.actorId,
      });
    } catch (error) {
      return handleRouteError(res, config, error, "GET /api/projects/:projectId/spec/status", actor);
    }
  });

  app.post("/api/projects/:projectId/operator/send", async (req, res) => {
    const actor = await getRequestActor(req, config);
    try {
      const auth = await getVerifiedAuth(req, config);
      const role = auth.role;
      const message = String((req.body as any)?.message || "");

      const project = await repo.getProject(req.params.projectId);
      if (!project) return res.status(404).json({ error: "Project not found" });

      ensureGovernanceApprovalState(project, actor.actorId);
      ensureDeploymentState(project as any);

      const analysisText = [project.request, buildIntakeContext(project), message].filter(Boolean).join("\n\n");
      const analysisBlueprint = matchBlueprintFromText(analysisText);
      const analyzed = analyzeSpec({ appName: project.name, request: analysisText, blueprint: analysisBlueprint, actorId: actor.actorId });
      const mergedSpec = mergeSpecWithExisting(getMasterSpec(project), analyzed.spec);
      setMasterSpec(project, mergedSpec);
      setSpecClarifications(project, analyzed.clarifications);
      project.runs = { ...((project.runs || {}) as Record<string, unknown>), [specStyleRunKey]: analyzed.style };

      let route = "status_report";
      let nextAction = "Refresh project status.";
      let actionResult: Record<string, unknown> = {};

      if (hasLaunchIntent(message)) {
        route = "launch_gate";
        let governance = getGovernanceApprovalState(project);

        if (hasRuntimeProofCaptureIntent(message) && role === "admin") {
          governance = {
            ...governance,
            runtimeProofStatus: "captured",
            updatedAt: now(),
            updatedBy: actor.actorId,
          };
          project.runs = { ...((project.runs || {}) as Record<string, unknown>), [governanceStateRunKey]: governance };
          project.governanceApproval = governance;
          emitEvent(project as any, {
            id: `evt_${Date.now()}`,
            projectId: project.projectId,
            type: "governance_approval_updated",
            actorId: actor.actorId,
            role,
            timestamp: now(),
            metadata: { runtimeProofStatus: governance.runtimeProofStatus, approvalStatus: governance.approvalStatus },
          });
        }

        if (hasGovernanceApproveIntent(message) && role === "admin") {
          governance = getGovernanceApprovalState(project);
          if (governance.runtimeProofStatus === "captured") {
            governance = {
              ...governance,
              approvalStatus: "approved",
              updatedAt: now(),
              updatedBy: actor.actorId,
            };
            project.runs = { ...((project.runs || {}) as Record<string, unknown>), [governanceStateRunKey]: governance };
            project.governanceApproval = governance;
            emitEvent(project as any, {
              id: `evt_${Date.now()}`,
              projectId: project.projectId,
              type: "governance_approval_updated",
              actorId: actor.actorId,
              role,
              timestamp: now(),
              metadata: { runtimeProofStatus: governance.runtimeProofStatus, approvalStatus: governance.approvalStatus },
            });
          }
        }

        const gate = buildGate(project);
        const governanceIssues = validateGovernanceForAction(getGovernanceApprovalState(project), "Launch");

        if (governanceIssues.length > 0) {
          nextAction = governanceIssues[0];
          actionResult = {
            gateStatus: gate.launchStatus,
            governanceApprovalStatus: gate.governanceApproval.approvalStatus,
            runtimeProofStatus: gate.governanceApproval.runtimeProofStatus,
          };
        } else if (gate.launchStatus !== "ready") {
          nextAction = gate.issues[0] || "Resolve gate blockers before launch.";
          actionResult = {
            gateStatus: gate.launchStatus,
            issues: gate.issues,
          };
        } else if (role !== "admin") {
          nextAction = "Escalate to an admin to promote production deployment.";
          actionResult = {
            gateStatus: gate.launchStatus,
            requiredRole: "admin",
            actualRole: role,
          };
        } else {
          route = "launch_promote";
          const environment = "prod";
          (project as any).deployments[environment] = {
            environment,
            status: "promoted",
            promotedAt: now(),
            promotedBy: actor.actorId,
          };
          emitEvent(project as any, {
            id: `evt_${Date.now()}`,
            projectId: project.projectId,
            type: "promote",
            actorId: actor.actorId,
            role,
            timestamp: now(),
            metadata: { environment, via: "operator_send" },
          });
          nextAction = "Monitor production health and audit signals.";
          actionResult = { promoted: true, environment };
        }

        recomputeProjectStatus(project);
        await persistProject(config, project);
        const overview = buildOverview(project);
        const operatorMessage = formatOperatorVoice({
          direct: route === "launch_promote"
            ? "Launch promoted to production."
            : "Launch request received; governance or gate conditions are not yet satisfied.",
          status: project.status,
          blockers: buildGate(project).issues,
          nextAction,
        });
        emitEvent(project as any, {
          id: `evt_${Date.now()}`,
          projectId: project.projectId,
          type: "operator_send",
          actorId: actor.actorId,
          role,
          timestamp: now(),
          metadata: { route, message },
        });
        await persistProject(config, project);
        return res.json({
          ok: true,
          route,
          status: project.status,
          blockers: buildGate(project).issues,
          nextAction,
          actorId: actor.actorId,
          operatorMessage,
          actionResult: { ...actionResult, readiness: overview.readiness.status },
        });
      }

      if (hasUncompiledIntake(project) || !project.masterTruth) {
        route = "compile";
        const updated = compileProjectWithIntake(project);
        emitEvent(updated as any, {
          id: `evt_${Date.now()}`,
          projectId: updated.projectId,
          type: "compile",
          actorId: actor.actorId,
          role,
          timestamp: now(),
          metadata: { via: "operator_send" },
        });
        emitEvent(updated as any, {
          id: `evt_${Date.now()}_op`,
          projectId: updated.projectId,
          type: "operator_send",
          actorId: actor.actorId,
          role,
          timestamp: now(),
          metadata: { route, message },
        });
        await repo.upsertProject(updated);
        return res.json({
          ok: true,
          route,
          status: updated.status,
          blockers: buildOverview(updated).blockers,
          nextAction: "Generate an execution plan.",
          actorId: actor.actorId,
          operatorMessage: formatOperatorVoice({
            direct: "Compiled updated project spec from operator input and uploaded artifacts.",
            status: updated.status,
            blockers: buildOverview(updated).blockers,
            nextAction: "Generate an execution plan.",
          }),
          actionResult: { compiled: true },
        });
      }

      if (!project.plan) {
        const buildBlockers = getBuildBlockers(project);
        if (buildBlockers.length > 0) {
          return res.json({
            ok: true,
            route: "build_blocked",
            status: project.status,
            blockers: buildBlockers,
            nextAction: "Resolve spec clarifications and approve build contract before planning.",
            actorId: actor.actorId,
            operatorMessage: formatOperatorVoice({
              direct: "Build is blocked until contract/spec requirements are complete.",
              status: project.status,
              blockers: buildBlockers,
              nextAction: "Resolve spec clarifications and approve build contract before planning.",
            }),
            actionResult: { blocked: true },
          });
        }
        route = "plan";
        const plan = generatePlan(project.masterTruth as any);
        const updated = { ...project, plan, status: "queued", updatedAt: now() } as StoredProjectRecord;
        emitEvent(updated as any, {
          id: `evt_${Date.now()}`,
          projectId: updated.projectId,
          type: "plan",
          actorId: actor.actorId,
          role,
          timestamp: now(),
          metadata: { via: "operator_send" },
        });
        emitEvent(updated as any, {
          id: `evt_${Date.now()}_op`,
          projectId: updated.projectId,
          type: "operator_send",
          actorId: actor.actorId,
          role,
          timestamp: now(),
          metadata: { route, message },
        });
        await repo.upsertProject(updated);
        return res.json({
          ok: true,
          route,
          status: updated.status,
          blockers: buildOverview(updated).blockers,
          nextAction: "Dispatch next packet for execution.",
          actorId: actor.actorId,
          operatorMessage: formatOperatorVoice({
            direct: "Plan generated and queued for execution.",
            status: updated.status,
            blockers: buildOverview(updated).blockers,
            nextAction: "Dispatch next packet for execution.",
          }),
          actionResult: { planned: true, packetCount: getPackets(updated).length },
        });
      }

      if (hasMissingValidation(project)) {
        route = "validate_missing";
        const packets = getPackets(project);
        const missing = packets.find((packet: any) => packet.status === "complete" && !((project.validations || {}) as Record<string, unknown>)[packet.packetId]);
        if (missing) {
          const validation = runValidation(project.projectId, missing.packetId);
          project.validations = {
            ...((project.validations || {}) as Record<string, unknown>),
            [missing.packetId]: validation,
          };
          emitEvent(project as any, {
            id: `evt_${Date.now()}`,
            projectId: project.projectId,
            type: "validation",
            actorId: actor.actorId,
            role,
            timestamp: now(),
            metadata: { packetId: missing.packetId, via: "operator_send" },
          });
          emitEvent(project as any, {
            id: `evt_${Date.now()}_op`,
            projectId: project.projectId,
            type: "operator_send",
            actorId: actor.actorId,
            role,
            timestamp: now(),
            metadata: { route, message },
          });
          await persistProject(config, project);
          const overview = buildOverview(project);
          const direct = (validation as any)?.status === "passed"
            ? `Validation completed for ${missing.packetId}.`
            : `Validation reported issues for ${missing.packetId}.`;
          const nextAction = (validation as any)?.status === "passed"
            ? "Execute next pending packet or request launch readiness check."
            : "Review validation findings and repair blocked packets.";
          return res.json({
            ok: true,
            route,
            status: project.status,
            blockers: overview.blockers,
            nextAction,
            actorId: actor.actorId,
            operatorMessage: formatOperatorVoice({ direct, status: project.status, blockers: overview.blockers, nextAction }),
            actionResult: { packetId: missing.packetId, validation },
          });
        }
      }

      const pendingPacket = getNextPendingPacket(project);
      if (pendingPacket) {
        const buildBlockers = getBuildBlockers(project);
        if (buildBlockers.length > 0) {
          return res.json({
            ok: true,
            route: "build_blocked",
            status: project.status,
            blockers: buildBlockers,
            nextAction: "Resolve spec/build blockers before execution.",
            actorId: actor.actorId,
            operatorMessage: formatOperatorVoice({
              direct: "Execution is blocked by unresolved spec or contract requirements.",
              status: project.status,
              blockers: buildBlockers,
              nextAction: "Resolve spec/build blockers before execution.",
            }),
            actionResult: { blocked: true, packetId: pendingPacket.packetId },
          });
        }
        if (roleRank(role) < roleRank("reviewer")) {
          const overview = buildOverview(project);
          const nextAction = "Reviewer or admin must authorize execute-next dispatch.";
          emitEvent(project as any, {
            id: `evt_${Date.now()}`,
            projectId: project.projectId,
            type: "operator_send",
            actorId: actor.actorId,
            role,
            timestamp: now(),
            metadata: { route: "execute_report", message },
          });
          await persistProject(config, project);
          return res.json({
            ok: true,
            route: "execute_report",
            status: project.status,
            blockers: overview.blockers,
            nextAction,
            actorId: actor.actorId,
            operatorMessage: formatOperatorVoice({
              direct: `Execution is ready for packet ${pendingPacket.packetId}, but your role cannot dispatch jobs.`,
              status: project.status,
              blockers: overview.blockers,
              nextAction,
            }),
            actionResult: { packetId: pendingPacket.packetId, requiredRole: "reviewer" },
          });
        }

        route = "execute_next";
        const jobId = `job_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        await enqueueJob({ job_id: jobId, project_id: project.projectId, packet_id: pendingPacket.packetId });
        emitEvent(project as any, {
          id: `evt_${Date.now()}`,
          projectId: project.projectId,
          type: "operator_send",
          actorId: actor.actorId,
          role,
          timestamp: now(),
          metadata: { route, packetId: pendingPacket.packetId, jobId, message },
        });
        await persistProject(config, project);
        const overview = buildOverview(project);
        return res.json({
          ok: true,
          route,
          status: project.status,
          blockers: overview.blockers,
          nextAction: "Monitor execution progress and wait for packet completion.",
          actorId: actor.actorId,
          operatorMessage: formatOperatorVoice({
            direct: `Queued execution for ${pendingPacket.packetId}.`,
            status: project.status,
            blockers: overview.blockers,
            nextAction: "Monitor execution progress and wait for packet completion.",
          }),
          actionResult: { jobId, packetId: pendingPacket.packetId },
        });
      }

      const overview = buildOverview(project);
      const gate = buildGate(project);
      nextAction = overview.blockers[0] || gate.issues[0] || "Project is idle; provide more scope or request launch readiness.";
      emitEvent(project as any, {
        id: `evt_${Date.now()}`,
        projectId: project.projectId,
        type: "operator_send",
        actorId: actor.actorId,
        role,
        timestamp: now(),
        metadata: { route, message },
      });
      await persistProject(config, project);
      return res.json({
        ok: true,
        route,
        status: project.status,
        blockers: [...overview.blockers, ...gate.issues],
        nextAction,
        actorId: actor.actorId,
        operatorMessage: formatOperatorVoice({
          direct: "No automatic transition was triggered; reporting current execution state.",
          status: project.status,
          blockers: [...overview.blockers, ...gate.issues],
          nextAction,
        }),
        actionResult: {
          packetCount: overview.summary.packetCount,
          completedPackets: overview.summary.completedPackets,
          failedPackets: overview.summary.failedPackets,
          launchStatus: gate.launchStatus,
        },
      });
    } catch (error) {
      return handleRouteError(res, config, error, "POST /api/projects/:projectId/operator/send", actor);
    }
  });

  app.post("/api/projects/:projectId/compile", async (req, res) => {
    const actor = await getRequestActor(req, config);
    try {
      const project = await repo.getProject(req.params.projectId);
      if (!project) return res.status(404).json({ error: "Project not found" });
      const updated = compileProjectWithIntake(project);
      emitEvent(updated as any, { id: `evt_${Date.now()}`, projectId: updated.projectId, type: "compile", actorId: actor.actorId, timestamp: now() });
      await repo.upsertProject(updated);
      return res.json({ projectId: updated.projectId, status: updated.status, actorId: actor.actorId });
    } catch (error) {
      return handleRouteError(res, config, error, "POST /api/projects/:projectId/compile", actor);
    }
  });

  app.post("/api/projects/:projectId/plan", async (req, res) => {
    const actor = await getRequestActor(req, config);
    try {
      const project = await repo.getProject(req.params.projectId);
      if (!project || !project.masterTruth) return res.status(404).json({ error: "No master truth" });
      const buildBlockers = getBuildBlockers(project);
      if (buildBlockers.length > 0) {
        return res.status(409).json({ error: "Build is blocked until contract/spec requirements are satisfied", blockers: buildBlockers });
      }
      const plan = generatePlan(project.masterTruth as any);
      const updated = { ...project, plan, status: "queued", updatedAt: now() } as StoredProjectRecord;
      emitEvent(updated as any, { id: `evt_${Date.now()}`, projectId: updated.projectId, type: "plan", actorId: actor.actorId, timestamp: now() });
      await repo.upsertProject(updated);
      return res.json({ projectId: updated.projectId, status: updated.status, actorId: actor.actorId });
    } catch (error) {
      return handleRouteError(res, config, error, "POST /api/projects/:projectId/plan", actor);
    }
  });

  app.post("/api/projects/:projectId/dispatch/execute-next", requireRole("reviewer", config), async (req, res) => {
    const actor = await getRequestActor(req, config);
    try {
      const project = await repo.getProject(req.params.projectId);
      if (!project || !project.plan) return res.status(404).json({ error: "No plan" });
      const buildBlockers = getBuildBlockers(project);
      if (buildBlockers.length > 0) {
        return res.status(409).json({ error: "Execution blocked: spec/build contract not ready", blockers: buildBlockers });
      }
      const packet = getNextPendingPacket(project);
      if (!packet) return res.status(409).json({ error: "No pending packet", actorId: actor.actorId });
      const jobId = `job_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      await enqueueJob({ job_id: jobId, project_id: project.projectId, packet_id: packet.packetId });
      return res.status(202).json({ accepted: true, queued: true, jobId, packetId: packet.packetId, actorId: actor.actorId, workerId });
    } catch (error) {
      return handleRouteError(res, config, error, "POST /api/projects/:projectId/dispatch/execute-next", actor);
    }
  });

  app.post("/api/projects/:projectId/repair/replay", requireRole("admin", config), async (req, res) => {
    const actor = await getRequestActor(req, config);
    try {
      const project = await repo.getProject(req.params.projectId);
      if (!project || !project.plan) return res.status(404).json({ error: "No plan" });
      const governanceApproval = getGovernanceApprovalState(project);
      const missingGovernance = validateGovernanceForAction(governanceApproval, "Replay");
      if (missingGovernance.length > 0) {
        return res.status(409).json({
          error: "Cannot replay: governance requirements not satisfied",
          issues: missingGovernance,
          governanceApprovalStatus: governanceApproval.approvalStatus,
          runtimeProofStatus: governanceApproval.runtimeProofStatus,
        });
      }
      const repairablePackets = getRepairablePackets(project);
      if (repairablePackets.length === 0) return res.status(409).json({ error: "No repairable packets", actorId: actor.actorId });
      const replayed: string[] = [];
      for (const packet of repairablePackets) {
        clearReplayState(project, packet.packetId);
        setPacketStatus(project, packet.packetId, "pending");
        const jobId = `job_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        await enqueueJob({ job_id: jobId, project_id: project.projectId, packet_id: packet.packetId });
        replayed.push(packet.packetId);
      }
      recomputeProjectStatus(project);
      emitEvent(project as any, { id: `evt_${Date.now()}`, projectId: project.projectId, type: "repair_replay", actorId: actor.actorId, role: "admin", timestamp: now(), metadata: { replayed } });
      await persistProject(config, project);
      return res.status(202).json({ accepted: true, replayed, governanceApprovalStatus: governanceApproval.approvalStatus, actorId: actor.actorId, workerId });
    } catch (error) {
      return handleRouteError(res, config, error, "POST /api/projects/:projectId/repair/replay", actor);
    }
  });

  app.get("/api/projects/:projectId/status", async (req, res) => {
    const actor = await getRequestActor(req, config);
    try {
      const project = await repo.getProject(req.params.projectId);
      if (!project) return res.status(404).json({ error: "Project not found" });
      const intakeArtifacts = getIntakeArtifacts(project);
      return res.json({ ...project, intakeArtifacts, actorId: actor.actorId, workerId });
    } catch (error) {
      return handleRouteError(res, config, error, "GET /api/projects/:projectId/status", actor);
    }
  });

  app.get("/api/projects/:projectId/ui/overview", async (req, res) => {
    const actor = await getRequestActor(req, config);
    try {
      const project = await repo.getProject(req.params.projectId);
      if (!project) return res.status(404).json({ error: "Project not found" });
      return res.json({ ...buildOverview(project), actorId: actor.actorId, workerId });
    } catch (error) {
      return handleRouteError(res, config, error, "GET /api/projects/:projectId/ui/overview", actor);
    }
  });

  app.get("/api/projects/:projectId/ui/packets", async (req, res) => {
    const actor = await getRequestActor(req, config);
    try {
      const project = await repo.getProject(req.params.projectId);
      if (!project) return res.status(404).json({ error: "Project not found" });
      return res.json({ packets: buildPacketList(project), actorId: actor.actorId, workerId });
    } catch (error) {
      return handleRouteError(res, config, error, "GET packets", actor);
    }
  });

  app.get("/api/projects/:projectId/ui/artifacts", requireRole("reviewer", config), async (req, res) => {
    const actor = await getRequestActor(req, config);
    try {
      const project = await repo.getProject(req.params.projectId);
      if (!project) return res.status(404).json({ error: "Project not found" });
      return res.json({ artifacts: buildArtifactList(project), actorId: actor.actorId, workerId });
    } catch (error) {
      return handleRouteError(res, config, error, "GET artifacts", actor);
    }
  });

  app.get("/api/projects/:projectId/ui/gate", requireRole("reviewer", config), async (req, res) => {
    const actor = await getRequestActor(req, config);
    try {
      const auth = await getVerifiedAuth(req, config);
      const project = await repo.getProject(req.params.projectId);
      if (!project) return res.status(404).json({ error: "Project not found" });
      return res.json({ ...buildGate(project), role: auth.role, userId: auth.userId, issuer: auth.issuer || null, actorId: actor.actorId, workerId });
    } catch (error) {
      return handleRouteError(res, config, error, "GET /api/projects/:projectId/ui/gate", actor);
    }
  });

  app.post("/api/projects/:projectId/governance/approval", requireRole("admin", config), async (req, res) => {
    const actor = await getRequestActor(req, config);
    try {
      const project = await repo.getProject(req.params.projectId);
      if (!project) return res.status(404).json({ error: "Project not found" });

      const input = req.body || {};
      const nextApprovalStatus = input.approvalStatus as GovernanceApprovalState["approvalStatus"] | undefined;
      const nextRuntimeProofStatus = input.runtimeProofStatus as GovernanceApprovalState["runtimeProofStatus"] | undefined;

      if (nextApprovalStatus && nextApprovalStatus !== "pending" && nextApprovalStatus !== "approved") {
        return res.status(400).json({ error: "Invalid approvalStatus", allowed: ["pending", "approved"] });
      }

      if (nextRuntimeProofStatus && nextRuntimeProofStatus !== "required" && nextRuntimeProofStatus !== "captured") {
        return res.status(400).json({ error: "Invalid runtimeProofStatus", allowed: ["required", "captured"] });
      }

      const current = getGovernanceApprovalState(project);
      const updated: GovernanceApprovalState = {
        ...current,
        approvalStatus: nextApprovalStatus || current.approvalStatus,
        runtimeProofStatus: nextRuntimeProofStatus || current.runtimeProofStatus,
        updatedAt: now(),
        updatedBy: actor.actorId,
      };

      if (updated.approvalStatus === "approved" && updated.runtimeProofStatus !== "captured") {
        return res.status(409).json({
          error: "Cannot approve governance until runtime proof is captured",
          governanceApproval: updated,
        });
      }

      project.governanceApproval = updated;
      project.runs = {
        ...((project.runs || {}) as Record<string, unknown>),
        [governanceStateRunKey]: updated,
      };
      emitEvent(project as any, {
        id: `evt_${Date.now()}`,
        projectId: project.projectId,
        type: "governance_approval_updated",
        actorId: actor.actorId,
        role: "admin",
        timestamp: now(),
        metadata: { approvalStatus: updated.approvalStatus, runtimeProofStatus: updated.runtimeProofStatus },
      });
      await persistProject(config, project);

      return res.json({ success: true, governanceApproval: updated, actorId: actor.actorId });
    } catch (error) {
      return handleRouteError(res, config, error, "POST /api/projects/:projectId/governance/approval", actor);
    }
  });

  app.post("/api/projects/:projectId/deploy/promote", requireRole("admin", config), async (req, res) => {
    const actor = await getRequestActor(req, config);
    try {
      const { environment } = req.body;
      const project = await repo.getProject(req.params.projectId);
      if (!project) return res.status(404).json({ error: "Project not found" });
      const governanceApproval = getGovernanceApprovalState(project);
      const missingGovernance = validateGovernanceForAction(governanceApproval, "Promotion");
      if (missingGovernance.length > 0) {
        return res.status(409).json({
          error: "Cannot promote: governance requirements not satisfied",
          issues: missingGovernance,
          governanceApprovalStatus: governanceApproval.approvalStatus,
          runtimeProofStatus: governanceApproval.runtimeProofStatus,
        });
      }
      const gate = buildGate(project);
      if (gate.launchStatus !== "ready") {
        return res.status(409).json({ error: "Cannot promote: gate not ready", issues: gate.issues });
      }
      ensureDeploymentState(project as any);
      (project as any).deployments[environment] = { environment, status: "promoted", promotedAt: now(), promotedBy: actor.actorId };
      emitEvent(project as any, { id: `evt_${Date.now()}`, projectId: project.projectId, type: "promote", actorId: actor.actorId, role: "admin", timestamp: now(), metadata: { environment } });
      await persistProject(config, project);
      return res.json({ success: true, environment, governanceApprovalStatus: governanceApproval.approvalStatus, actorId: actor.actorId });
    } catch (error) {
      return handleRouteError(res, config, error, "POST deploy/promote", actor);
    }
  });

  app.post("/api/projects/:projectId/deploy/rollback", requireRole("admin", config), async (req, res) => {
    const actor = await getRequestActor(req, config);
    try {
      const { environment } = req.body;
      const project = await repo.getProject(req.params.projectId);
      if (!project) return res.status(404).json({ error: "Project not found" });
      if (!environment || !["dev", "staging", "prod"].includes(environment)) {
        return res.status(400).json({ error: "Invalid environment", allowed: ["dev", "staging", "prod"] });
      }
      ensureDeploymentState(project as any);
      const current = (project as any).deployments[environment];
      if (!current || !current.promotedAt) {
        return res.status(409).json({ error: "Cannot rollback: environment has not been promoted", environment });
      }
      (project as any).deployments[environment] = {
        ...current,
        status: "rolled_back",
        rollbackAt: now(),
        rollbackBy: actor.actorId,
      };
      emitEvent(project as any, {
        id: `evt_${Date.now()}`,
        projectId: project.projectId,
        type: "rollback",
        actorId: actor.actorId,
        role: "admin",
        timestamp: now(),
        metadata: { environment },
      });
      await persistProject(config, project);
      return res.json({ success: true, environment, status: "rolled_back", actorId: actor.actorId });
    } catch (error) {
      return handleRouteError(res, config, error, "POST /api/projects/:projectId/deploy/rollback", actor);
    }
  });

  app.get("/api/projects/:projectId/ui/deployments", requireRole("reviewer", config), async (req, res) => {
    const actor = await getRequestActor(req, config);
    try {
      const project = await repo.getProject(req.params.projectId);
      if (!project) return res.status(404).json({ error: "Project not found" });
      ensureDeploymentState(project as any);
      return res.json({ deployments: (project as any).deployments, actorId: actor.actorId });
    } catch (error) {
      return handleRouteError(res, config, error, "GET deployments", actor);
    }
  });

  app.get("/api/projects/:projectId/ui/audit", requireRole("reviewer", config), async (req, res) => {
    const actor = await getRequestActor(req, config);
    try {
      const project = await repo.getProject(req.params.projectId);
      if (!project) return res.status(404).json({ error: "Project not found" });
      ensureAudit(project as any);
      return res.json({ events: (project as any).auditEvents.slice(0, 100), actorId: actor.actorId });
    } catch (error) {
      return handleRouteError(res, config, error, "GET audit", actor);
    }
  });

  return app;
}
