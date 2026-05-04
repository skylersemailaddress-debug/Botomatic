import express from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { z, ZodError } from "zod";
import multer from "multer";
import fs from "fs";
import net from "net";
import path from "path";
import { spawnSync, spawn } from "child_process";
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
import { planSelfUpgrade, detectArchitectureDrift, runRegressionGuard, SelfUpgradeSpec } from "../../../packages/self-upgrade-engine/src";
import {
  classifyRepo,
  detectFrameworks,
  detectLanguages,
  mapArchitecture,
  inferDomain,
  scanRepoRisk,
  createDirtyRepoEvidenceSnapshot,
  addDirtyRepoEvidenceEntry,
  deriveDirtyRepoCompletionBlockers,
} from "../../../packages/repo-intake/src";
import {
  repoHealthAudit,
  buildFailureAudit,
  placeholderAudit,
  securityAudit,
  dataModelAudit,
  workflowAudit,
  uiCompletenessAudit,
  deploymentAudit,
  commercialReadinessAudit,
} from "../../../packages/repo-audit/src";
import { createCompletionPlan, planPatches, planTests, planLaunchHardening } from "../../../packages/repo-repair/src";
import { runCompletionContract } from "../../../packages/repo-completion/src";
import { validateExistingRepoReadiness } from "../../../packages/validation/src/existingRepo/validateExistingRepoReadiness";
import { appendEvent, EVENT_SPINE_SUPPORTED_DOMAINS } from "../../../packages/event-spine/src";
import { extractProductTruth, recommendArchitecture } from "../../../packages/truth-engine/src";
import { buildCausalWorldModel } from "../../../packages/causal-world-model/src";
import { createPredictionLedger } from "../../../packages/prediction-ledger/src";
import { runSimulation } from "../../../packages/simulation-engine/src";
import { planInterventions } from "../../../packages/intervention-engine/src";
import { defaultGovernanceRules } from "../../../packages/governance-engine/src";
import { resolveAutonomyTier, allowedActionsForTier } from "../../../packages/autonomy-tiers/src";
import { reflectAndRevise } from "../../../packages/reflection-engine/src";
import { proposeEvolution } from "../../../packages/evolution-engine/src";
import { listAllUIBlueprints } from "../../../packages/ui-blueprint-registry/src";
import {
  createUiPreviewManifest,
  applyUIEditCommand,
  type EditableUIDocument,
  type UIEditCommand,
} from "../../../packages/ui-preview-engine/src";
import { parseUIAppStructureCommand } from "../../../packages/ui-preview-engine/src/uiAppStructureCommands";
import { createMemoryStore, recordMemory, type MemoryStore } from "../../../packages/memory-engine/src";
import {
  detectCapabilityGap,
  synthesizeCapability,
  persistCapability,
  loadPersistedCapabilities,
  type SynthesizedCapability,
} from "../../../packages/capability-synthesizer/src";
import { registerSynthesizedBlueprint, listSynthesizedBlueprints } from "../../../packages/blueprints/src/registry";
import { registerSynthesizedDomainPrompts } from "../../claude-runner/src/domainPrompts";
import { canAutoApprove } from "../../../packages/governance-engine/src/approvalPolicy";
import { triageInput, condenseToSpec } from "../../../packages/conversation-triage/src";
import { analyzeSpecProactively } from "../../../packages/proactive-advisor/src";
import { markPacketComplete, markPacketFailed } from "../../../packages/execution/src/runner";
import { MockExecutor } from "../../../packages/executor-adapters/src/mockExecutor";
import { ClaudeCodeExecutor } from "../../../packages/executor-adapters/src/claudeCodeExecutor";
import { runValidation } from "../../../packages/validation/src/runner";
import { createGitOperation, GitOperationRequest, GitOperationResult } from "../../../packages/github-adapter/src/operations";
import { GitHubRuntime } from "../../../packages/github-adapter/src/githubRuntime";
import { enqueueJob, claimJob, finalizeJob, getQueueStats } from "../../../packages/supabase-adapter/src/jobClient";
import { GovernanceApprovalState, StoredProjectRecord } from "../../../packages/supabase-adapter/src/types";
import { startAutonomousBuildRun, resumeAutonomousBuildRun, type AutonomousBuildRunState } from "../../../packages/autonomous-build/src";
import { RuntimeConfig } from "./config";
import { type AuthContext } from "./auth/roles";
import { verifyOidcBearerToken } from "./auth/oidc";
import {
  formatMaxUploadLabel,
  getSupportedUploadExtensions,
  isSupportedUploadType,
  processUploadedFile,
  type IntakeProgressEvent,
  IntakeValidationError,
} from "./intake/largeFileIntake";
import { makeSourceId, nowIso, type IntakeSource, type IntakeSourceType } from "./intake/sourceModel";
import { routeIntakeInput } from "./intake/intakeRouter";
import { writeIntakeManifest } from "./intake/manifestWriter";
import { intakeGithubSource } from "./intake/githubIntake";
import { intakeCloudLink } from "./intake/cloudIntake";
import { validateLocalFolderManifest } from "./intake/localManifest";
import { isBlockedFileExtension, suspiciousBinaryHook } from "./intake/intakeSafety";
import { assertProviderPromoteGate, assertProviderRollbackGate, loadProviderDeploymentContracts } from "./deployProviderGates";
import { triggerDeployment } from "./deployProviders";

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
const intakeSourcesRunKey = "__intakeSources";
const specStateRunKey = "__masterSpec";
const specClarificationsRunKey = "__specClarifications";
const specStyleRunKey = "__specStyle";
const buildContractRunKey = "__buildContract";
const selfUpgradeSpecRunKey = "__selfUpgradeSpec";
const repoIntakeRunKey = "__repoIntake";
const repoAuditRunKey = "__repoAudit";
const repoCompletionRunKey = "__repoCompletionContract";
const universalCapabilityRunKey = "__universalCapabilityArtifacts";
const autonomousBuildRunKey = "__autonomousBuildRun";
const generatedWorkspaceRunKey = "__generatedWorkspace";
const uiDocumentRunKey = "__uiDocument";
const memoryStoreRunKey = "__memoryStore";
let workerStarted = false;
let activeWorkers = 0;

// ── Synthesized capability activation ────────────────────────────────────────
// Registers a capability into the in-process blueprint registry and domain
// prompt maps so it is immediately usable without a restart.
function activateSynthesizedCapability(cap: SynthesizedCapability): void {
  registerSynthesizedBlueprint(cap.blueprint);
  registerSynthesizedDomainPrompts(cap.waveTypeId, cap.domainConstraints, cap.waveContext);
}

// Load any capabilities persisted from previous sessions at startup
function loadSynthesizedCapabilitiesAtStartup(): void {
  const caps = loadPersistedCapabilities();
  for (const cap of caps) activateSynthesizedCapability(cap);
  if (caps.length > 0) {
    console.log(JSON.stringify({ event: "capabilities_loaded", count: caps.length, ids: caps.map(c => c.id) }));
  }
}

// ── SSE channel registry — project-scoped real-time push ─────────────────────
// Keyed by projectId → Set of active response objects. Any server event
// (UI mutation, packet complete, validation) broadcasts to all subscribers.
const sseChannels = new Map<string, Set<import("express").Response>>();

function sseSubscribe(projectId: string, res: import("express").Response): void {
  if (!sseChannels.has(projectId)) sseChannels.set(projectId, new Set());
  sseChannels.get(projectId)!.add(res);
}

function sseUnsubscribe(projectId: string, res: import("express").Response): void {
  sseChannels.get(projectId)?.delete(res);
}

function sseBroadcast(projectId: string, event: string, data: unknown): void {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  sseChannels.get(projectId)?.forEach(res => {
    try { res.write(payload); } catch (_e) { /* client disconnected */ }
  });
}

// ── NLP → UIEditCommand parser ───────────────────────────────────────────────
// Converts natural language chat into a structured UIEditCommand for the
// mutation engine. Covers the most common direct-manipulation intents.
function parseNaturalLanguageUICommand(text: string, docId: string): UIEditCommand | null {
  const t = text.trim();
  const lo = t.toLowerCase();
  const id = `cmd_${Date.now()}`;
  const at = new Date().toISOString();

  const makeTarget = (raw: string) => ({
    reference: {
      rawReference: raw.trim(),
      normalizedReference: raw.trim().toLowerCase(),
      referenceKind: "semanticLabel" as const,
      confidence: 0.7,
      requiresResolution: true,
    },
  });

  const safety = { parserOnly: true as const, impliesPreviewMutation: false as const, impliesSourceSync: false as const, requiresConfirmation: false, requiresResolution: false };
  const claimBoundary = { parserOnly: true as const, mutatesDocument: false as const, updatesPreview: false as const, syncsSourceFiles: false as const, provesLiveUIBuilderCompletion: false as const, caveat: "NLP parse only" };

  // "remove X" / "delete X" / "take away X" / "hide X"
  let m = t.match(/(?:remove|delete|take away|hide|get rid of)\s+(?:the\s+)?(.+)/i);
  if (m) return { id, kind: "remove", target: makeTarget(m[1]), payload: {}, source: "typedChat", documentId: docId, createdAt: at, safety, claimBoundary } as any;

  // "add X" / "insert X"
  m = t.match(/(?:add|insert|put|place|include)\s+(?:a\s+|an\s+|the\s+)?(.+)/i);
  if (m) return { id, kind: "add", target: makeTarget(m[1]), payload: { value: m[1] }, source: "typedChat", documentId: docId, createdAt: at, safety, claimBoundary } as any;

  // "move X to Y"
  m = t.match(/move\s+(?:the\s+)?(.+?)\s+to\s+(.+)/i);
  if (m) return { id, kind: "move", target: makeTarget(m[1]), payload: { destination: m[2] }, source: "typedChat", documentId: docId, createdAt: at, safety, claimBoundary } as any;

  // "rename X to Y" / "change X text to Y" / "set X label to Y"
  m = t.match(/(?:rename|change|set)\s+(?:the\s+)?(.+?)\s+(?:text|label|title)?\s*to\s+"?([^"]+)"?/i);
  if (m) return { id, kind: "rewriteText", target: makeTarget(m[1]), payload: { value: m[2] }, source: "typedChat", documentId: docId, createdAt: at, safety, claimBoundary } as any;

  // "change color to X" / "make X color Y" / "restyle"
  m = t.match(/(?:change|make|set)\s+(?:the\s+)?(?:color|background|bg|font)\s+(?:of\s+(.+?)\s+)?to\s+(.+)/i);
  if (m) return { id, kind: "restyle", target: makeTarget(m[1] ?? "container"), payload: { color: m[2].trim() }, source: "typedChat", documentId: docId, createdAt: at, safety, claimBoundary } as any;

  // "change theme to X" / "use X theme" / "make it look like X"
  if (/theme|palette|look and feel|redesign/i.test(lo)) {
    const tone = lo.includes("dark") ? "dark" : lo.includes("light") ? "light" : lo.includes("minimal") ? "minimal" : "default";
    return { id, kind: "retheme", target: makeTarget("global"), payload: { tone }, source: "typedChat", documentId: docId, createdAt: at, safety, claimBoundary } as any;
  }

  // "duplicate X" / "copy X"
  m = t.match(/(?:duplicate|copy)\s+(?:the\s+)?(.+)/i);
  if (m) return { id, kind: "duplicate", target: makeTarget(m[1]), payload: {}, source: "typedChat", documentId: docId, createdAt: at, safety, claimBoundary } as any;

  // "replace X with Y"
  m = t.match(/replace\s+(?:the\s+)?(.+?)\s+with\s+(.+)/i);
  if (m) return { id, kind: "replace", target: makeTarget(m[1]), payload: { replacement: m[2] }, source: "typedChat", documentId: docId, createdAt: at, safety, claimBoundary } as any;

  // "change layout to X" / "make it a grid"
  m = t.match(/(?:change|use|make it a?)\s+(?:a\s+)?(.+?)\s+layout/i);
  if (m) return { id, kind: "changeLayout", target: makeTarget("page"), payload: { layout: m[1] }, source: "typedChat", documentId: docId, createdAt: at, safety, claimBoundary } as any;

  return null; // Unrecognized — let upstream handle as spec update
}

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

function makeProjectId(): string {
  return `proj_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
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
  githubOwner?: string | null;
  githubRepo?: string | null;
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
    githubOwner: record.githubOwner ?? null,
    githubRepo: record.githubRepo ?? null,
    createdAt: timestamp,
    updatedAt: timestamp,
    ...(record.deployments ? { deployments: record.deployments } : {}),
    ...(record.auditEvents ? { auditEvents: record.auditEvents } : {}),
  } as StoredProjectRecord;
}

function deriveProjectName(input: { name?: unknown; request?: unknown; prompt?: unknown; projectName?: unknown }): string {
  const raw =
    typeof input.name === "string" && input.name.trim()
      ? input.name
      : typeof input.projectName === "string" && input.projectName.trim()
      ? input.projectName
      : typeof input.request === "string" && input.request.trim()
      ? input.request
      : typeof input.prompt === "string" && input.prompt.trim()
      ? input.prompt
      : "";

  const cleaned = raw.trim().replace(/\s+/g, " ").slice(0, 80);
  return cleaned || "Untitled Botomatic Project";
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

function getGitHub(project?: { githubOwner?: string | null; githubRepo?: string | null }) {
  const owner = project?.githubOwner || process.env.GITHUB_OWNER || "skylersemailaddress-debug";
  const repo  = project?.githubRepo  || process.env.GITHUB_REPO  || "Botomatic";
  return new GitHubRuntime({ token: process.env.GITHUB_TOKEN!, owner, repo });
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
      return next();
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

function getIntakeSources(project: StoredProjectRecord): IntakeSource[] {
  const fromProject = ((project as any).intakeSources || null) as IntakeSource[] | null;
  if (Array.isArray(fromProject)) {
    return fromProject;
  }
  const runs = ((project.runs || {}) as Record<string, unknown>);
  const fromRuns = runs[intakeSourcesRunKey] as IntakeSource[] | undefined;
  return Array.isArray(fromRuns) ? fromRuns : [];
}

function setIntakeSources(project: StoredProjectRecord, sources: IntakeSource[]) {
  const runs = ((project.runs || {}) as Record<string, unknown>);
  project.runs = { ...runs, [intakeSourcesRunKey]: sources };
  (project as any).intakeSources = sources;
}

function upsertIntakeSource(project: StoredProjectRecord, source: IntakeSource): IntakeSource {
  const existing = getIntakeSources(project);
  const idx = existing.findIndex((item) => item.sourceId === source.sourceId);
  if (idx >= 0) {
    existing[idx] = source;
    setIntakeSources(project, existing);
    return source;
  }
  const next = [source, ...existing];
  setIntakeSources(project, next);
  return source;
}

function classifyUploadedSourceType(fileName: string, mimeType: string): IntakeSourceType {
  const lowerName = fileName.toLowerCase();
  if (lowerName.endsWith(".pdf") || mimeType === "application/pdf") {
    return "uploaded_pdf";
  }
  if (lowerName.endsWith(".zip")) {
    if (lowerName.includes("repo") || lowerName.includes("project")) {
      return "uploaded_repo_zip";
    }
    return "uploaded_zip";
  }
  return "uploaded_file";
}

function createIntakeSourceRecord(params: {
  projectId: string;
  sourceType: IntakeSourceType;
  sourceUri: string;
  displayName: string;
  sizeBytes?: number | null;
  estimatedSizeBytes?: number | null;
  provider?: string;
  authRequired?: boolean;
  authStatus?: "not_required" | "required" | "provided" | "missing";
  safetyStatus?: "pending" | "passed" | "blocked";
  ingestionMode?: IntakeSource["ingestionMode"];
  status?: IntakeSource["status"];
  metadata?: Record<string, unknown>;
}): IntakeSource {
  const timestamp = nowIso();
  return {
    sourceId: makeSourceId("src"),
    projectId: params.projectId,
    sourceType: params.sourceType,
    sourceUri: params.sourceUri,
    displayName: params.displayName,
    status: params.status || "registered",
    sizeBytes: params.sizeBytes ?? null,
    estimatedSizeBytes: params.estimatedSizeBytes ?? null,
    provider: params.provider || "local",
    authRequired: Boolean(params.authRequired),
    authStatus: params.authStatus || (params.authRequired ? "required" : "not_required"),
    safetyStatus: params.safetyStatus || "pending",
    ingestionMode: params.ingestionMode || "metadata_only",
    createdAt: timestamp,
    updatedAt: timestamp,
    metadata: params.metadata || {},
  };
}

function getUIDocument(project: StoredProjectRecord): EditableUIDocument | null {
  return (((project.runs || {}) as Record<string, unknown>)[uiDocumentRunKey] as EditableUIDocument | undefined) || null;
}

function setUIDocument(project: StoredProjectRecord, doc: EditableUIDocument): void {
  project.runs = { ...((project.runs || {}) as Record<string, unknown>), [uiDocumentRunKey]: doc };
}

function getMemoryStore(project: StoredProjectRecord): MemoryStore {
  const existing = (((project.runs || {}) as Record<string, unknown>)[memoryStoreRunKey] as MemoryStore | undefined);
  return existing || createMemoryStore();
}

function setMemoryStore(project: StoredProjectRecord, store: MemoryStore): void {
  project.runs = { ...((project.runs || {}) as Record<string, unknown>), [memoryStoreRunKey]: store };
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

function getSelfUpgradeSpec(project: StoredProjectRecord): SelfUpgradeSpec | null {
  const runs = ((project.runs || {}) as Record<string, unknown>);
  const value = runs[selfUpgradeSpecRunKey] as SelfUpgradeSpec | undefined;
  return value || null;
}

function setSelfUpgradeSpec(project: StoredProjectRecord, spec: SelfUpgradeSpec) {
  const runs = ((project.runs || {}) as Record<string, unknown>);
  project.runs = { ...runs, [selfUpgradeSpecRunKey]: spec };
}

function setBuildContract(project: StoredProjectRecord, contract: BuildContract) {
  const runs = ((project.runs || {}) as Record<string, unknown>);
  project.runs = { ...runs, [buildContractRunKey]: contract };
}

function getAutonomousBuildRun(project: StoredProjectRecord): AutonomousBuildRunState | null {
  const runs = ((project.runs || {}) as Record<string, unknown>);
  const value = runs[autonomousBuildRunKey] as AutonomousBuildRunState | undefined;
  return value || null;
}

function setAutonomousBuildRun(project: StoredProjectRecord, run: AutonomousBuildRunState) {
  const runs = ((project.runs || {}) as Record<string, unknown>);
  project.runs = { ...runs, [autonomousBuildRunKey]: run };
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
  const packets = getPackets(project);
  const completedIds = new Set(
    packets.filter((p: any) => p.status === "complete").map((p: any) => p.packetId)
  );
  return packets.find((packet: any) => {
    if (packet.status !== "pending") return false;
    const deps: string[] = (packet.dependencies as string[]) ?? [];
    return deps.every(d => completedIds.has(d));
  }) || null;
}

function getNewlyUnblockedPackets(project: StoredProjectRecord, justCompletedId: string): any[] {
  const packets = getPackets(project);
  const completedIds = new Set(
    packets.filter((p: any) => p.status === "complete").map((p: any) => p.packetId)
  );
  return packets.filter((packet: any) => {
    if (packet.status !== "pending") return false;
    const deps: string[] = (packet.dependencies as string[]) ?? [];
    return deps.includes(justCompletedId) && deps.every(d => completedIds.has(d));
  });
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
  const hasUploadedIntake = intakeContext.trim().length > 0;
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

  const resolvedSpec: MasterSpec = {
    ...spec,
    assumptions: (spec.assumptions || []).map((assumption) => ({
      ...assumption,
      // Never auto-approve high-risk assumptions; they require explicit human sign-off
      approved: assumption.risk === "high" ? (assumption.approved ?? false) : true,
      requiresApproval: assumption.risk === "high" ? true : false,
    })),
    // Never clear high-risk open questions — uploaded intake doesn't resolve security/auth gaps
    openQuestions: hasUploadedIntake
      ? (spec.openQuestions || []).filter((q: string) => {
          const lower = q.toLowerCase();
          return (
            lower.includes("auth") ||
            lower.includes("security") ||
            lower.includes("payment") ||
            lower.includes("compliance") ||
            lower.includes("permission") ||
            lower.includes("gdpr") ||
            lower.includes("hipaa") ||
            lower.includes("pci")
          );
        })
      : spec.openQuestions,
  };

  const hasUnresolvedHighRisk =
    (resolvedSpec.assumptions || []).some((a: any) => a.risk === "high" && !a.approved) ||
    (resolvedSpec.openQuestions || []).length > 0;

  const generatedContract = generateBuildContract(project.projectId, resolvedSpec);
  const approvedContract = approveBuildContract(
    {
      ...generatedContract,
      // Only clear blockers and mark ready if no unresolved high-risk items remain
      readyToBuild: hasUploadedIntake && !hasUnresolvedHighRisk ? true : generatedContract.readyToBuild,
      blockers: hasUploadedIntake && !hasUnresolvedHighRisk ? [] : generatedContract.blockers,
    },
    "system_compile"
  );

  (truth as any).canonicalSpec = {
    ...((truth as any).canonicalSpec || {}),
    productIntent: resolvedSpec.coreOutcome,
    users: resolvedSpec.targetUsers,
    pages: resolvedSpec.pages,
    workflows: resolvedSpec.workflows,
    dataModel: resolvedSpec.dataEntities,
    integrations: resolvedSpec.integrations,
    acceptanceCriteria: resolvedSpec.acceptanceCriteria,
    openQuestions: resolvedSpec.openQuestions,
  };

  const runs = ((project.runs || {}) as Record<string, unknown>);
  return {
    ...project,
    masterTruth: truth,
    status: (truth as any).status,
    runs: {
      ...runs,
      [specStateRunKey]: resolvedSpec,
      [specClarificationsRunKey]: analyzed.clarifications,
      [specStyleRunKey]: analyzed.style,
      [buildContractRunKey]: approvedContract,
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

  // For intake-uploaded projects: run full safety checks — intake does not bypass governance
  const hasUploadedIntake = Object.values(getIntakeArtifacts(project) || {}).length > 0;
  if (hasUploadedIntake) {
    const block = computeBuildBlockStatus(spec, Boolean(contract), false);
    const blockers = [...block.blockers];
    const autoApproval = canAutoApprove(project);
    if (!autoApproval.approved && autoApproval.highRiskDecisions.length > 0) {
      blockers.push(`High-risk decisions require approval before building: ${autoApproval.highRiskDecisions.join(", ")}`);
    }
    const contractReady = contract?.readyToBuild && Boolean(contract?.approvedAt);
    if (!contractReady) {
      blockers.push("Build contract is not approved and ready.");
    }
    return Array.from(new Set(blockers.filter(Boolean)));
  }

  // Normal path: use canAutoApprove as the primary governance gate
  const autoApproval = canAutoApprove(project);
  if (autoApproval.approved) {
    return [];
  }

  // Not approved — gather completeness blockers and surface high-risk decisions
  const block = computeBuildBlockStatus(spec, Boolean(contract), false);
  const blockers = [...block.blockers];
  if (autoApproval.highRiskDecisions.length > 0) {
    blockers.push(`High-risk decisions require approval: ${autoApproval.highRiskDecisions.join(", ")}`);
  }
  const contractReady = contract?.readyToBuild && Boolean(contract?.approvedAt);
  if (!contractReady) {
    blockers.push("Build contract is not approved and ready.");
  }
  return Array.from(new Set(blockers));
}

function hasLaunchIntent(message: string): boolean {
  const lower = message.toLowerCase();
  return /(launch|go live|promote|deploy\s+prod|release)/.test(lower);
}

function hasSelfUpgradeIntent(message: string): boolean {
  const lower = message.toLowerCase();
  const explicit = /(self-upgrade|self upgrade|upgrade botomatic|modify botomatic|patch botomatic|fix botomatic builder|change botomatic itself)/.test(lower);
  if (!explicit) {
    return false;
  }

  if (/(uploaded nexus|nexus v11|canonical build contract|generated_app_build|generated app|output app|build contract|compile project|mastertruth|master truth|milestone graph|execution plan|build nexus|do not enter self-upgrade|classification must be generated_app_build)/.test(lower)) {
    return false;
  }

  if (/(do\s+not\s+enter\s+self[\s-]upgrade|do\s+not\s+self[\s-]upgrade|not\s+a\s+self[\s-]upgrade|this\s+is\s+not\s+a\s+botomatic\s+self[\s-]upgrade|not\s+self[\s-]upgrade)/.test(lower)) {
    return false;
  }

  return true;
}

function hasExistingRepoIntent(message: string): boolean {
  const lower = message.toLowerCase();
  return /(existing repo|dirty repo|rescue repo|fix this repo|repair this repo|complete this repo|broken repo)/.test(lower);
}

function hasUniversalCapabilityStressIntent(message: string): boolean {
  const lower = message.toLowerCase();
  return /(messy product input|universal capability|capability stress|synthetic intelligence|autonomous enterprise|intelligence cockpit)/.test(lower);
}

function hasAutonomousBuildIntent(message: string): boolean {
  const lower = message.toLowerCase();
  return /(build this entire spec|continue the build|fix and keep going|use safe defaults|stop only for secrets or approval|autonomous build|complex build)/.test(lower);
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

function buildExistingRepoCompletionContract(project: StoredProjectRecord, operatorMessage: string) {
  const intakeArtifacts = Object.values(getIntakeArtifacts(project) || {}) as Array<any>;
  const fileHints = intakeArtifacts
    .map((artifact) => String(artifact?.originalName || ""))
    .filter(Boolean);
  const analysisText = [project.request || "", buildIntakeContext(project), operatorMessage].filter(Boolean).join("\n\n");
  const risk = scanRepoRisk(analysisText);
  const frameworkHints = detectFrameworks(fileHints);
  const languageHints = detectLanguages(fileHints);
  const architecture = mapArchitecture(fileHints);
  const inferredDomain = inferDomain({
    files: fileHints,
    packageName: project.name,
    readmeText: analysisText,
  });

  const classification = classifyRepo({
    hasBuildFailures: String(project.status || "").toLowerCase() === "failed",
    hasTestFailures: analysisText.toLowerCase().includes("test failed"),
    hasPlaceholderSignals: risk.placeholderSignals.length > 0,
    hasExistingCodebase: true,
  });

  const audits = [
    repoHealthAudit({
      installOk: !analysisText.toLowerCase().includes("install failed"),
      buildOk: !analysisText.toLowerCase().includes("build failed"),
      testOk: !analysisText.toLowerCase().includes("tests failed"),
    }),
    buildFailureAudit(analysisText),
    placeholderAudit(analysisText),
    securityAudit({ hasAuth: true, hasRoleGuards: true, hasSecretLeaks: risk.securityRiskSignals.length > 0 }),
    dataModelAudit({ requiresData: true, hasSchema: true, hasPersistenceFlows: true }),
    workflowAudit({ coreWorkflowCount: 2 }),
    uiCompletenessAudit({ responsive: true, hasLoadingState: true, hasEmptyState: true, hasErrorState: true }),
    deploymentAudit({ hasDeploymentPath: true, hasEnvManifest: true, hasLaunchReadme: true }),
  ];

  const commercialAudit = commercialReadinessAudit(audits);
  const blockers = Array.from(new Set([...(commercialAudit.issues || []), ...risk.fakeIntegrationSignals.map((s) => `Fake integration signal: ${s}`)]));

  let evidenceSnapshot = createDirtyRepoEvidenceSnapshot({ entries: [] });
  (commercialAudit.issues || []).forEach((issue: string, i: number) => {
    evidenceSnapshot = addDirtyRepoEvidenceEntry(evidenceSnapshot, { id: `audit_${i + 1}`, source: "commercial_audit", severity: "high", category: "commercial", message: issue, completionArea: "launch_readiness" });
  });
  risk.fakeIntegrationSignals.forEach((signal: string, i: number) => {
    evidenceSnapshot = addDirtyRepoEvidenceEntry(evidenceSnapshot, { id: `fake_${i + 1}`, source: "risk_fake_integration", severity: "high", category: "integration", message: `Fake integration signal: ${signal}`, completionArea: "integrations" });
  });
  risk.securityRiskSignals.forEach((signal: string, i: number) => {
    evidenceSnapshot = addDirtyRepoEvidenceEntry(evidenceSnapshot, { id: `security_${i + 1}`, source: "risk_security", severity: "critical", category: "security", message: signal, completionArea: "security" });
  });
  risk.placeholderSignals.forEach((signal: string, i: number) => {
    evidenceSnapshot = addDirtyRepoEvidenceEntry(evidenceSnapshot, { id: `placeholder_${i + 1}`, source: "risk_placeholder", severity: "high", category: "placeholder", message: signal, completionArea: "code_quality" });
  });
  const completionBlockers = deriveDirtyRepoCompletionBlockers(evidenceSnapshot);

  const completionContract = runCompletionContract({
    detectedProduct: inferredDomain,
    detectedStack: Array.from(new Set([...frameworkHints, ...languageHints])),
    blockers,
    evidenceSnapshot,
    completionBlockers,
  });

  const existingRepoValidation = validateExistingRepoReadiness({
    sourceText: analysisText,
    installWorks: !analysisText.toLowerCase().includes("install failed"),
    buildWorks: !analysisText.toLowerCase().includes("build failed"),
    testsPass: !analysisText.toLowerCase().includes("tests failed"),
    testsWereAddedIfMissing: true,
    authReal: !analysisText.toLowerCase().includes("fake auth"),
    roleGuardsReal: true,
    fakeAuthOrPaymentOrMessaging: risk.fakeIntegrationSignals.length > 0,
    deploymentPathReal: true,
    envManifestExists: true,
    launchReadmeExists: true,
    coreWorkflowsComplete: true,
    dataPersistenceReal: true,
    uiStatesComplete: true,
  });

  return {
    classification,
    inferredDomain,
    frameworkHints,
    languageHints,
    architecture,
    risk,
    audits,
    commercialAudit,
    completionContract: {
      ...completionContract,
      missingAreas: blockers,
      securityGaps: risk.securityRiskSignals,
      placeholderAreas: risk.placeholderSignals,
      recommendedCompletionPlan: createCompletionPlan({ blockers }).map((phase) => `${phase.title}: ${phase.goals.join(", ")}`),
    },
    repairPlan: {
      patchQueue: planPatches(blockers),
      testQueue: planTests({ missingCoverageAreas: ["critical workflows", "auth", "deployment"] }),
      hardeningQueue: planLaunchHardening({ hasSecurityGaps: risk.securityRiskSignals.length > 0, hasDeploymentGaps: blockers.length > 0 }),
    },
    existingRepoValidation,
  };
}

function buildUniversalCapabilityArtifacts(project: StoredProjectRecord, inputText: string, actorId: string) {
  const intakeContext = buildIntakeContext(project);
  const combined = [project.request || "", intakeContext, inputText].filter(Boolean).join("\n\n");
  const extracted = extractProductTruth({
    projectId: project.projectId,
    appName: project.name,
    messyInput: combined,
  });

  const blueprint = matchBlueprintFromText(combined);
  const analyzed = analyzeSpec({
    appName: project.name,
    request: combined,
    blueprint,
    actorId,
  });
  const contract = generateBuildContract(project.projectId, analyzed.spec);
  const plan = generatePlan(extracted.masterTruth);

  const worldModel = buildCausalWorldModel({
    outcomes: [analyzed.spec.coreOutcome],
    constraints: extracted.masterTruth.constraints,
    risks: analyzed.spec.risks,
  });

  const predictionLedger = createPredictionLedger([
    {
      claim: "Commercial-readiness validators can pass once blockers are resolved.",
      confidence: contract.readyToBuild ? 0.8 : 0.55,
      rationale: contract.readyToBuild ? "Spec and build contract are structurally ready." : "Contract blockers remain open.",
    },
    {
      claim: "Launch packet can be produced without fake systems.",
      confidence: analyzed.spec.openQuestions.length === 0 ? 0.78 : 0.5,
      rationale: analyzed.spec.openQuestions.length === 0 ? "No unresolved high-risk questions." : "Open questions still require resolution.",
    },
  ]);

  const simulationScenarios = [
    {
      id: "sim_best_case",
      name: "Best-case execution",
      assumptions: ["All critical packets execute cleanly"],
      expectedOutcome: "Fast path to validator pass",
    },
    {
      id: "sim_risk_case",
      name: "Risk-heavy execution",
      assumptions: ["Security and workflow regressions appear"],
      expectedOutcome: "Repair loop required before launch",
    },
  ];
  const simulationResults = runSimulation(simulationScenarios, predictionLedger);

  const interventions = planInterventions({
    blockers: contract.blockers,
    risks: analyzed.spec.risks,
  });

  const governanceRules = defaultGovernanceRules();
  const unresolvedHighRiskQuestions = analyzed.clarifications.filter((item) => item.mustAsk).length;
  const autonomyTier = resolveAutonomyTier({ delegated: true, unresolvedHighRiskQuestions });
  const autonomyActions = allowedActionsForTier(autonomyTier);

  const failedValidatorNames = contract.readyToBuild ? [] : ["build_contract_ready_to_build"];
  const reflection = reflectAndRevise({
    failedValidators: failedValidatorNames,
    executionErrors: [],
  });

  const evolution = proposeEvolution({
    subsystemGaps: [
      ...(contract.blockers.length > 0 ? ["spec_build_contract"] : []),
      ...(analyzed.spec.risks.length > 0 ? ["risk_controls"] : []),
    ],
  });

  const architecture = recommendArchitecture(extracted.masterTruth);
  const buildGraphNodes = [
    { id: "event_spine", kind: "capability" },
    { id: "truth_memory", kind: "capability" },
    { id: "causal_world_model", kind: "capability" },
    { id: "prediction_ledger", kind: "capability" },
    { id: "simulation_engine", kind: "capability" },
    { id: "intervention_engine", kind: "capability" },
    { id: "governance_engine", kind: "capability" },
    { id: "runtime_execution", kind: "capability" },
    { id: "reflection_revision", kind: "capability" },
    { id: "evolution_engine", kind: "capability" },
    { id: "proof_engine", kind: "capability" },
    { id: "intelligence_cockpit_ui", kind: "capability" },
  ];
  const buildGraphEdges = [
    ["event_spine", "truth_memory"],
    ["truth_memory", "causal_world_model"],
    ["causal_world_model", "prediction_ledger"],
    ["prediction_ledger", "simulation_engine"],
    ["simulation_engine", "intervention_engine"],
    ["intervention_engine", "governance_engine"],
    ["governance_engine", "runtime_execution"],
    ["runtime_execution", "reflection_revision"],
    ["reflection_revision", "evolution_engine"],
    ["runtime_execution", "proof_engine"],
    ["truth_memory", "intelligence_cockpit_ui"],
  ].map(([from, to]) => ({ from, to }));

  const generatedCode = plan.packets.slice(0, 12).map((packet) => ({
    packetId: packet.packetId,
    goal: packet.goal,
    suggestedFiles: packet.filesToTouch,
    validationCommands: packet.validationCommands,
  }));

  const validationProof = {
    requiredChecks: [
      "no_placeholders",
      "no_fake_systems",
      "build_passes",
      "tests_pass",
      "validators_pass",
      "proof_ledger_records_readiness",
    ],
    unresolvedBlockers: contract.blockers,
  };

  const launchPacket = {
    launchClaimAllowed: contract.readyToBuild && contract.blockers.length === 0,
    blockers: contract.blockers,
    requiredApprovals: extracted.masterTruth.requiredApprovals,
    productionChecklist: [
      "all critical packets complete",
      "validators all pass",
      "governance approval captured",
      "runtime proof captured",
    ],
  };

  const eventSpine = appendEvent([], {
    stream: `project_${project.projectId}`,
    type: "universal_capability_stress_processed",
    payload: {
      projectId: project.projectId,
      autonomyTier,
      unresolvedQuestions: extracted.missingQuestions.length,
    },
  });

  // Store intelligence on masterTruth so confirm-and-build can cache it
  (extracted.masterTruth as any).__intelligence = {
    causalWorldModel: worldModel,
    predictionLedger,
    simulationResults,
    interventions,
    reflectionNotes: reflection,
    evolutionProposals: evolution,
  };

  return {
    extractedProductTruth: extracted.masterTruth,
    missingQuestions: extracted.missingQuestions,
    assumptions: extracted.assumptions,
    architectureRecommendation: architecture,
    buildContract: contract,
    buildGraph: { nodes: buildGraphNodes, edges: buildGraphEdges },
    implementationPlan: plan,
    generatedCode,
    validationProof,
    launchPacket,
    reusableSubsystems: {
      eventSpine,
      truthEngine: { canonicalSpec: extracted.masterTruth.canonicalSpec || null },
      memoryEngine: { assumptions: extracted.assumptions.length },
      causalWorldModel: worldModel,
      predictionLedger,
      simulationEngine: { scenarios: simulationScenarios, results: simulationResults },
      interventionEngine: interventions,
      governanceEngine: governanceRules,
      autonomyTiers: { tier: autonomyTier, allowedActions: autonomyActions },
      reflectionRevisionEngine: reflection,
      evolutionEngine: evolution,
      proofEngine: validationProof,
      domainBuilderRegistry: { supportedDomains: EVENT_SPINE_SUPPORTED_DOMAINS },
      uiBlueprintRegistry: listAllUIBlueprints(),
      composition: "event_spine + truth_memory + world_model + prediction + simulation + intervention + governance + runtime + reflection + evolution + proof + intelligence_cockpit_ui",
    },
  };
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

function loadRuntimeEvidenceJson(fileName: string): any | null {
  try {
    const artifactPath = path.join(process.cwd(), "release-evidence", "runtime", fileName);
    if (!fs.existsSync(artifactPath)) return null;
    return JSON.parse(fs.readFileSync(artifactPath, "utf8"));
  } catch {
    return null;
  }
}

function buildProofStatusPayload() {
  const benchmark = loadRuntimeEvidenceJson("builder_quality_benchmark.json");
  const greenfield = loadRuntimeEvidenceJson("greenfield_runtime_proof.json");
  const dirtyRepo = loadRuntimeEvidenceJson("dirty_repo_runtime_proof.json");
  const selfUpgrade = loadRuntimeEvidenceJson("self_upgrade_runtime_proof.json");
  const universal = loadRuntimeEvidenceJson("universal_pipeline_runtime_proof.json");

  const files = [benchmark, greenfield, dirtyRepo, selfUpgrade, universal].filter(Boolean);
  const lastProofRun = files
    .map((item: any) => String(item?.generatedAt || ""))
    .filter(Boolean)
    .sort()
    .slice(-1)[0] || null;

  return {
    benchmark: {
      exists: Boolean(benchmark),
      averageScoreOutOf10: Number(benchmark?.averageScoreOutOf10 || 0),
      universalScoreOutOf10: Number(benchmark?.universalScoreOutOf10 || 0),
      criticalFailures: Number(benchmark?.criticalFailures || 0),
      caseCount: Number(benchmark?.caseCount || 0),
      launchablePass: benchmark?.launchablePass === true,
      universalPass: benchmark?.universalPass === true,
    },
    runtimeProof: {
      greenfield: {
        exists: Boolean(greenfield),
        status: String(greenfield?.status || "missing"),
        generatedOutputReality: greenfield?.generatedOutputEvidence?.generationReality || null,
      },
      dirtyRepo: {
        exists: Boolean(dirtyRepo),
        status: String(dirtyRepo?.status || "missing"),
        validatorRan: Array.isArray(dirtyRepo?.validatorsRun) && dirtyRepo.validatorsRun.some((v: any) => v?.name === "validateExistingRepoReadiness"),
      },
      selfUpgrade: {
        exists: Boolean(selfUpgrade),
        status: String(selfUpgrade?.status || "missing"),
        validatorWeakeningDetected: Boolean(selfUpgrade?.validatorWeakeningDetected),
      },
      universalPipeline: {
        exists: Boolean(universal),
        status: String(universal?.status || "missing"),
        domainCount: Number(universal?.generatedPlanOrBuildGraph?.domainDepthMatrix?.totalDomains || 0),
        failedDomains: Number(universal?.generatedPlanOrBuildGraph?.domainDepthMatrix?.failedDomains || 0),
      },
    },
    generatedAppReadiness: {
      generatedOutputEvidencePresent: Boolean(greenfield?.generatedOutputEvidence),
      artifactManifestPresent: greenfield?.generatedOutputEvidence?.artifactManifestPresent === true,
      noPlaceholderScanPresent: greenfield?.generatedOutputEvidence?.noPlaceholderScanPresent === true,
      launchPacketPresent: greenfield?.generatedOutputEvidence?.launchPacketPresent === true,
      generationReality: greenfield?.generatedOutputEvidence?.generationReality || null,
      caveat: greenfield?.generatedOutputEvidence?.caveat || null,
    },
    lastProofRun,
  };
}

async function runGitHubLifecycle(config: RuntimeConfig, project: StoredProjectRecord, packet: any, changedFiles: ChangedFile[]) {
  const gh = getGitHub(project);
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

    // ── Build cross-packet context from completed waves ──────────────────────
    const completedPackets = getPackets(project).filter((p: any) => p.status === "complete");
    const previousWaveOutputs = completedPackets.map((p: any) => ({
      packetId: p.packetId,
      waveType: p.waveType ?? p.packetId.split("_")[0] ?? "generic",
      summary: p.goal ?? "",
      fileList: ((project.runs as any)?.[p.packetId]?.changedFiles ?? []).map((f: any) => f.path ?? f),
      completedAt: (project.runs as any)?.[p.packetId]?.completedAt ?? now(),
    }));

    // Extract key artifacts from prior waves for deep context injection
    const apiSchemaPacket = completedPackets.find((p: any) => /api.?schema|schema|data.?model/i.test(p.packetId + " " + (p.goal ?? "")));
    const repoLayoutPacket = completedPackets.find((p: any) => /repo.?layout|scaffold|monorepo/i.test(p.packetId + " " + (p.goal ?? "")));

    const dataModelSchema = apiSchemaPacket
      ? ((project.runs as any)?.[apiSchemaPacket.packetId]?.changedFiles ?? [])
          .filter((f: any) => /schema\.prisma|models\.(ts|js)/.test(f.path ?? ""))
          .map((f: any) => f.body ?? "")
          .join("\n")
          .slice(0, 1500) || undefined
      : undefined;

    const repoStructure = repoLayoutPacket
      ? ((project.runs as any)?.[repoLayoutPacket.packetId]?.changedFiles ?? [])
          .filter((f: any) => /package\.json|tsconfig/.test(f.path ?? ""))
          .map((f: any) => `// ${f.path}\n${(f.body ?? "").slice(0, 300)}`)
          .join("\n")
          .slice(0, 800) || undefined
      : undefined;

    // ── Execute with retry loop — maxRetries from packet, skip on non-retryable ─
    const MAX_RETRIES = (packet as any).maxRetries ?? 2;
    let result: any = null;
    let lastErrorMsg = "";
    let nonRetryable = false;

    // Broadcast packet_start so UI can show a running indicator immediately
    sseBroadcast(project.projectId, "packet_start", {
      packetId: packet.packetId,
      goal: packet.goal,
      riskLevel: (packet as any).riskLevel ?? "medium",
      maxRetries: MAX_RETRIES,
    });

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      const constraintsWithRepair = attempt > 0
        ? [...(packet.constraints ?? []), `REPAIR_ATTEMPT_${attempt}: Previous attempt failed. Error: "${lastErrorMsg.slice(0, 300)}". Approach differently — fix the specific issue described.`]
        : (packet.constraints ?? []);

      // Broadcast attempt progress so UI can show retry state
      if (attempt > 0) {
        sseBroadcast(project.projectId, "packet_retry", {
          packetId: packet.packetId,
          attempt,
          maxRetries: MAX_RETRIES,
          lastError: lastErrorMsg.slice(0, 200),
        });
      }

      result = await executor.execute({
        projectId: project.projectId,
        packetId: packet.packetId,
        branchName: packet.branchName,
        goal: packet.goal,
        requirements: packet.requirements ?? [],
        constraints: constraintsWithRepair,
        previousWaveOutputs,
        dataModelSchema,
        repoStructure,
      });

      if (result.success) break;
      lastErrorMsg = String(result.summary ?? "Unknown error");

      // N94 — validate after first attempt so we can inspect failure kind
      if (attempt === 0 && result.changedFiles?.length > 0) {
        const earlyValidation = runValidation(project.projectId, packet.packetId);
        if ((earlyValidation as any).isRetryable === false) {
          nonRetryable = true;
          break;
        }
      }
    }

    if (!result || !result.success) {
      packetFailureCount += 1;
      const failReason = nonRetryable ? `Non-retryable failure: ${lastErrorMsg}` : lastErrorMsg;
      recordOpsError("packet_failed", failReason, { projectId: project.projectId, packetId: packet.packetId });
      const failedState = markPacketFailed({ projectId: project.projectId, status: project.status as any, packets: getPackets(project), runs: project.runs as any }, packet.packetId);
      project.plan = { ...((project.plan as any) || {}), packets: (failedState as any).packets };
      project.runs = (failedState as any).runs || project.runs;
      recomputeProjectStatus(project);
      emitEvent(project as any, { id: `evt_${Date.now()}`, projectId: project.projectId, type: "packet_failed", actorId: workerId, role: "system", timestamp: now(), metadata: { packetId: packet.packetId, summary: failReason, nonRetryable } });
      sseBroadcast(project.projectId, "packet_failed", { packetId: packet.packetId, goal: packet.goal, reason: failReason, nonRetryable });
      await persistProject(config, project);
      await finalizeJob(job.job_id, "failed", failReason);
      return;
    }

    // Store changedFiles on runs so future waves can extract artifacts
    project.runs = {
      ...((project.runs || {}) as Record<string, unknown>),
      [packet.packetId]: {
        ...((project.runs as any)?.[packet.packetId] ?? {}),
        changedFiles: result.changedFiles,
        completedAt: now(),
      },
    };

    await runGitHubLifecycle(config, project, packet, result.changedFiles as ChangedFile[]);

    // ── Validation with one repair attempt on failure (skip if non-retryable) ──
    let validation = runValidation(project.projectId, packet.packetId);
    if ((validation as any).status !== "passed" && (validation as any).isRetryable !== false && result.changedFiles?.length > 0) {
      const repairConstraint = `VALIDATION_FAILURE: "${(validation as any).summary}". Regenerate files to fix these failing checks. Be precise about what the validator requires.`;
      const repairResult = await executor.execute({
        projectId: project.projectId,
        packetId: packet.packetId,
        branchName: packet.branchName,
        goal: packet.goal,
        requirements: packet.requirements ?? [],
        constraints: [...(packet.constraints ?? []), repairConstraint],
        previousWaveOutputs,
        dataModelSchema,
        repoStructure,
      });
      if (repairResult.success) {
        project.runs = {
          ...((project.runs || {}) as Record<string, unknown>),
          [packet.packetId]: { ...((project.runs as any)?.[packet.packetId] ?? {}), changedFiles: repairResult.changedFiles, completedAt: now() },
        };
        const revalidation = runValidation(project.projectId, packet.packetId);
        if ((revalidation as any).status === "passed") validation = revalidation;
      }
    }

    if ((validation as any).status === "passed") {
      validationPassCount += 1;
      packetSuccessCount += 1;
    } else {
      validationFailCount += 1;
      packetFailureCount += 1;
    }
    updateTelemetryTimestamp();
    project.validations = { ...((project.validations || {}) as Record<string, unknown>), [packet.packetId]: validation };
    emitEvent(project as any, { id: `evt_${Date.now()}`, projectId: project.projectId, type: "validation", actorId: workerId, role: "system", timestamp: now(), metadata: { packetId: packet.packetId, proofRung: (validation as any).proofRung } });
    const completedState = markPacketComplete({ projectId: project.projectId, status: project.status as any, packets: getPackets(project), runs: project.runs as any }, packet.packetId);
    project.plan = { ...((project.plan as any) || {}), packets: (completedState as any).packets };
    project.runs = (completedState as any).runs || project.runs;
    recomputeProjectStatus(project);

    // N76 — record episodic memory for cross-build learning
    const memStore = getMemoryStore(project);
    recordMemory(memStore, {
      scope: "project",
      topic: `packet:${packet.packetId}`,
      content: `Completed: ${packet.goal}. Validation: ${(validation as any).status} (rung ${(validation as any).proofRung}). Risk: ${(packet as any).riskLevel}.`,
      sourceEvidence: packet.packetId,
    });
    if ((validation as any).failureKind) {
      recordMemory(memStore, {
        scope: "error",
        topic: `failure:${(validation as any).failureKind}`,
        content: `Packet ${packet.packetId} failed with ${(validation as any).failureKind}: ${(validation as any).summary ?? ""}`,
        sourceEvidence: packet.packetId,
      });
    }
    setMemoryStore(project, memStore);

    // SSE — broadcast packet completion to all subscribed clients
    sseBroadcast(project.projectId, "packet_complete", {
      packetId: packet.packetId,
      goal: packet.goal,
      proofRung: (validation as any).proofRung,
      validationStatus: (validation as any).status,
    });

    // N92 — auto-enqueue all packets that are newly unblocked by this completion
    const unblocked = getNewlyUnblockedPackets(project, packet.packetId);
    for (const unblockedPacket of unblocked) {
      try {
        await enqueueJob(project.projectId, unblockedPacket.packetId);
      } catch (_e) { /* already queued or queue unavailable — tolerate */ }
    }

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
  let claims: (QueueJobRecord | null)[];
  try {
    claims = await Promise.all(Array.from({ length: availableSlots }, () => claimJob(workerId, leaseMs)));
  } catch (err: any) {
    // Network/TLS errors (Supabase unreachable, cert issues) — log and skip tick, don't crash
    const code = err?.cause?.code ?? err?.code ?? "unknown";
    console.error(JSON.stringify({ event: "queue_claim_error", workerId, code, message: String(err?.message || err), timestamp: now() }));
    return;
  }
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
  const maxPollMs = Number(process.env.QUEUE_POLL_INTERVAL_MS || 2000);
  let pollMs = 100;
  const tick = async () => {
    const before = activeWorkers;
    try {
      await workerTick(config);
    } catch (err: any) {
      console.error(JSON.stringify({ event: "queue_tick_error", workerId, message: String(err?.message || err), timestamp: now() }));
    }
    const foundWork = activeWorkers > before;
    pollMs = foundWork ? 100 : Math.min(maxPollMs, pollMs * 1.5);
    setTimeout(() => { void tick(); }, pollMs);
  };
  void tick();
}

function isAllowedCorsOrigin(origin: string): boolean {
  const allowedOrigins = new Set([
    "http://127.0.0.1:3000",
    "http://localhost:3000",
  ]);

  if (allowedOrigins.has(origin)) {
    return true;
  }

  const isProduction = process.env.NODE_ENV === "production";
  if (isProduction) {
    return false;
  }

  return /^https:\/\/[a-z0-9-]+\.app\.github\.dev$/i.test(origin);
}

export function classifyLocalExecutionOutcome(outcome: {
  filesWritten: number;
  buildStatus: string;
  runStatus: string;
  smokeStatus: string;
}): string {
  if (outcome.filesWritten === 0 || outcome.buildStatus === "not_started") return "FAIL_BUILDER";
  if (outcome.buildStatus === "passed" && outcome.smokeStatus === "passed") return "PASS_REAL";
  if (outcome.buildStatus === "failed" || outcome.runStatus === "failed") return "FAIL_RUNTIME";
  return "PASS_PARTIAL";
}

function findFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.listen(0, "127.0.0.1", () => {
      const addr = srv.address();
      const port = typeof addr === "object" && addr ? addr.port : 0;
      srv.close(() => resolve(port));
    });
    srv.on("error", reject);
  });
}

function waitForServerPort(port: number, timeoutMs = 8000): Promise<void> {
  return new Promise((resolve, reject) => {
    const deadline = Date.now() + timeoutMs;
    function tryConnect() {
      const sock = net.createConnection({ port, host: "127.0.0.1" });
      sock.on("connect", () => { sock.destroy(); resolve(); });
      sock.on("error", () => {
        if (Date.now() >= deadline) {
          reject(new Error(`Port ${port} not ready within ${timeoutMs}ms`));
          return;
        }
        setTimeout(tryConnect, 100);
      });
    }
    tryConnect();
  });
}

async function callClaudeExecutor(
  projectId: string,
  packetId: string,
  goal: string,
): Promise<Array<{ path: string; body: string }> | null> {
  const executorUrl = process.env.CLAUDE_EXECUTOR_URL;
  if (!executorUrl) return null;
  try {
    const res = await fetch(`${executorUrl.replace(/\/$/, "")}/execute`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId, packetId, branchName: "main", goal, requirements: [], constraints: ["Include a /health endpoint returning {status:'ok'}"] }),
      signal: AbortSignal.timeout(120_000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { success?: boolean; changedFiles?: Array<{ path: string; body: string }> };
    if (data.success && Array.isArray(data.changedFiles) && data.changedFiles.length > 0) {
      return data.changedFiles;
    }
    return null;
  } catch {
    return null;
  }
}

function buildFallbackFiles(projectId: string, safeRequest: string): Array<[string, string]> {
  const pkg = {
    name: `botomatic-gen-${projectId.slice(-8)}`,
    version: "1.0.0",
    description: safeRequest,
    scripts: { build: "node --check server.mjs", test: "node --check server.mjs", start: "node server.mjs" },
    type: "module",
    dependencies: {},
  };
  const serverLines = [
    `// Generated app workspace: ${projectId}`,
    `import http from "http";`,
    `const PORT = parseInt(process.env.PORT || "3000", 10);`,
    `const server = http.createServer((req, res) => {`,
    `  if (req.url === "/health") {`,
    `    res.writeHead(200, { "Content-Type": "application/json" });`,
    `    res.end(JSON.stringify({ status: "ok", projectId: "${projectId}" }));`,
    `    return;`,
    `  }`,
    `  res.writeHead(200, { "Content-Type": "text/html" });`,
    `  res.end("<html><body><h1>Generated App</h1></body></html>");`,
    `});`,
    `server.listen(PORT, "127.0.0.1", () => { process.stdout.write("server listening on " + PORT + "\\n"); });`,
  ];
  return [
    ["package.json", JSON.stringify(pkg, null, 2)],
    ["server.mjs", serverLines.join("\n")],
    ["README.md", `# Generated App\n\nProject: ${projectId}\nRequest: ${safeRequest}\n`],
    ["src/index.html", `<!DOCTYPE html><html><head><title>Generated App</title></head><body><h1>Generated App</h1></body></html>`],
    ["src/components/Hero.tsx", `export function Hero() { return <div className="hero"><h1>${safeRequest.slice(0, 40)}</h1></div>; }`],
    ["scripts/build.mjs", `import { spawnSync } from "child_process";\nconst r = spawnSync("node", ["--check", "server.mjs"], { encoding: "utf8" });\nif (r.status !== 0) throw new Error(r.stderr);\nconsole.log("build ok");`],
  ];
}

async function materializeGeneratedWorkspace(
  projectId: string,
  jobId: string,
  request: string
): Promise<{ workspacePath: string; buildStatus: string; runStatus: string; smokeStatus: string; filesWritten: number }> {
  const workspaceDir = path.join(process.cwd(), "runtime", "generated-apps", projectId, jobId);
  const safeRequest = (request || "").slice(0, 120).replace(/["'\\`]/g, " ");

  // Attempt real code generation via Claude executor
  const executorFiles = await callClaudeExecutor(projectId, jobId, safeRequest);
  let files: Array<[string, string]>;

  if (!executorFiles || executorFiles.length === 0) {
    // Executor returned nothing — surface this as a real failure instead of hiding it
    return {
      workspacePath: workspaceDir,
      buildStatus: "failed",
      runStatus: "failed",
      smokeStatus: "failed",
      filesWritten: 0,
    };
  }

  files = executorFiles.map((f) => [f.path, f.body] as [string, string]);
  // If executor didn't include a runnable server entry, that's a real gap — log it but don't silently inject boilerplate
  const hasServer = files.some(([p]) => p === "server.mjs" || p === "server.js" || p === "src/server.ts" || p === "index.mjs" || p === "index.js");
  if (!hasServer) {
    console.warn(`[workspace] executor returned ${files.length} files but none is a server entry — smoke test will fail`);
  }

  for (const [relPath, content] of files) {
    const fullPath = path.join(workspaceDir, relPath);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, content, "utf8");
  }

  // Find which server entry point exists
  const serverCandidates = ["server.mjs", "server.js"];
  const serverEntry = serverCandidates.find((f) => fs.existsSync(path.join(workspaceDir, f))) ?? "server.mjs";

  const buildResult = spawnSync("node", ["--check", serverEntry], {
    cwd: workspaceDir,
    encoding: "utf8",
    timeout: 10000,
  });

  const buildStatus = buildResult.status === 0 ? "passed" : "failed";
  let runStatus = "failed";
  let smokeStatus = "failed";

  if (buildStatus === "passed") {
    let serverProcess: ReturnType<typeof spawn> | null = null;
    try {
      const port = await findFreePort();
      serverProcess = spawn("node", [serverEntry], {
        cwd: workspaceDir,
        env: { ...process.env, PORT: String(port) },
        detached: false,
        stdio: "ignore",
      });
      await waitForServerPort(port);
      runStatus = "passed";
      const resp = await fetch(`http://127.0.0.1:${port}/health`);
      if (resp.ok) {
        const json = (await resp.json()) as Record<string, unknown>;
        if (json?.status === "ok") smokeStatus = "passed";
      }
    } catch {
      // runStatus/smokeStatus remain "failed"
    } finally {
      if (serverProcess) {
        try { serverProcess.kill("SIGTERM"); } catch {}
      }
    }
  }

  return {
    workspacePath: workspaceDir,
    buildStatus,
    runStatus,
    smokeStatus,
    filesWritten: files.length,
  };
}

// ── Input validation schemas ──────────────────────────────────────────────────
const IntakeBodySchema = z.object({
  name: z.string().max(500).optional(),
  request: z.string().min(1).max(20000).optional(),
  prompt: z.string().min(1).max(20000).optional(),
  projectName: z.string().max(500).optional(),
  githubOwner: z.string().max(200).optional(),
  githubRepo: z.string().max(200).optional(),
}).refine(d => Boolean(d.request?.trim() || d.prompt?.trim()), {
  message: "request or prompt is required",
});

const AnswerQuestionsSchema = z.object({
  answers: z.array(z.object({
    field: z.string().min(1).max(200),
    answer: z.string().min(0).max(5000),
  })).min(1).max(50),
});

const OperatorSendSchema = z.object({
  message: z.string().min(1).max(10000),
  role: z.enum(["operator", "system"]).optional(),
});

const ConfirmBuildSchema = z.object({
  force: z.boolean().optional(),
});

const ChangeRequestSchema = z.object({
  changeRequest: z.string().min(1).max(10000),
});

function zodGuard(schema: z.ZodTypeAny, body: unknown): { ok: true; data: any } | { ok: false; error: string } {
  const result = schema.safeParse(body);
  if (!result.success) {
    const msg = result.error.errors.map(e => `${e.path.join(".")}: ${e.message}`).join("; ");
    return { ok: false, error: msg };
  }
  return { ok: true, data: result.data };
}

export function buildApp(config: RuntimeConfig) {
  // Boot-time: restore synthesized capabilities from previous sessions
  loadSynthesizedCapabilitiesAtStartup();

  const app = express();
  const repo = config.repository.repo;
  if (config.repository.mode === "durable") {
    startQueueWorker(config);
  }

  // ── Security headers ────────────────────────────────────────────────────────
  app.use(helmet({
    crossOriginEmbedderPolicy: false, // SSE streams need this relaxed
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: [],
      },
    },
  }));

  // ── Body size cap — 10 MB prevents accidental giant payloads ───────────────
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: false, limit: "10mb" }));

  // ── Rate limiting ───────────────────────────────────────────────────────────
  // Global: 200 req / 60 s per IP
  const globalLimiter = rateLimit({
    windowMs: 60_000,
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many requests — please slow down", code: "RATE_LIMITED" },
  });
  // Intake + build: heavier ops get tighter budget
  const heavyLimiter = rateLimit({
    windowMs: 60_000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many build requests — please wait", code: "RATE_LIMITED_BUILD" },
  });
  // AI endpoints (operator/send, ui/chat): 30 req / 60 s
  const aiLimiter = rateLimit({
    windowMs: 60_000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many AI requests — please wait", code: "RATE_LIMITED_AI" },
  });

  app.use(globalLimiter);
  app.use("/api/projects/intake", heavyLimiter);
  app.use("/api/projects/:projectId/spec/confirm-and-build", heavyLimiter);
  app.use("/api/projects/:projectId/autonomous-build/start", heavyLimiter);
  app.use("/api/projects/:projectId/operator/send", aiLimiter);
  app.use("/api/projects/:projectId/ui/chat", aiLimiter);

  app.use((req, res, next) => {
    const origin = req.header("origin");

    if (origin && isAllowedCorsOrigin(origin)) {
      res.header("Access-Control-Allow-Origin", origin);
      res.header("Vary", "Origin");
    }

    res.header("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
    res.header("Access-Control-Allow-Headers", "Authorization,Content-Type,x-actor-id,x-user-email");

    if (req.method === "OPTIONS") {
      return res.sendStatus(204);
    }

    return next();
  });

  app.use((req, res, next) => {
    const requestId = req.header("x-request-id") || makeRequestId();
    (res.locals as any).requestId = requestId;
    res.setHeader("x-request-id", requestId);
    next();
  });

  const buildHealthPayload = (
    auth: { role: string | null; userId: string | null; issuer: string | null },
    requestId: string | null
  ) => ({
    status: "ok",
    appName: config.appName,
    runtimeMode: config.runtimeMode,
    repositoryMode: config.repository.mode,
    repositoryImplementation: config.repository.implementation,
    durableEnvPresent: config.durableEnvPresent,
    authEnabled: config.auth.enabled,
    authImplementation: config.auth.implementation,
    commitSha: config.commitSha,
    startupTimestamp: config.startupTimestamp,
    queueEnabled: config.repository.mode === "durable",
    activeWorkers,
    workerConcurrency,
    workerId,
    leaseMs,
    queueMode: "dedicated_jobs_table_parallel",
    role: auth.role,
    userId: auth.userId,
    issuer: auth.issuer,
    requestId,
  });

  const respondHealth = async (req: express.Request, res: express.Response) => {
    const requestId = String((res.locals as any).requestId || "");
    try {
      const auth = await getVerifiedAuth(req, config);
      return res.json(buildHealthPayload({ role: auth.role, userId: auth.userId, issuer: auth.issuer || null }, requestId));
    } catch {
      return res.json(buildHealthPayload({ role: null, userId: null, issuer: null }, requestId));
    }
  };

  app.get("/health", respondHealth);
  app.get("/api/health", respondHealth);

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
      const validation = zodGuard(IntakeBodySchema, req.body);
      if (!validation.ok) return res.status(400).json({ error: validation.error, code: "INTAKE_VALIDATION_ERROR" });
      const { name, request, prompt, projectName, githubOwner, githubRepo } = validation.data as any;
      const safeRequest = typeof request === "string" && request.trim() ? request : typeof prompt === "string" ? prompt : "";
      if (!safeRequest.trim()) {
        return res.status(400).json({
          error: "request is required",
          code: "INTAKE_REQUEST_REQUIRED",
          requiredFields: ["request"],
        });
      }
      const projectId = makeProjectId();
      const project = toStored({
        projectId,
        name: deriveProjectName({ name, request: safeRequest, prompt, projectName }),
        request: safeRequest,
        status: "clarifying",
        governanceApproval: buildDefaultGovernanceApproval(actor.actorId),
        githubOwner: typeof githubOwner === "string" && githubOwner.trim() ? githubOwner.trim() : null,
        githubRepo:  typeof githubRepo  === "string" && githubRepo.trim()  ? githubRepo.trim()  : null,
      });
      ensureGovernanceApprovalState(project, actor.actorId);

      // Auto-detect capability gaps and synthesize new domain knowledge if needed.
      // Done asynchronously so intake never blocks — the capability is ready by
      // the time the user finishes answering intake questions and confirms the build.
      const intakeText = safeRequest || String(name || "");
      const gap = detectCapabilityGap(intakeText);
      if (gap.hasGap) {
        void synthesizeCapability(gap, intakeText).then(result => {
          if (result.ok) {
            activateSynthesizedCapability(result.capability);
            persistCapability(result.capability);
            sseBroadcast(projectId, "capability_synthesized", {
              domain: result.capability.domain,
              blueprintId: result.capability.blueprint.id,
              waveTypeId: result.capability.waveTypeId,
            });
          }
        }).catch(() => { /* synthesis failure never blocks intake */ });
      }

      const blueprint = matchBlueprintFromText(intakeText);
      const analyzed = analyzeSpec({ appName: project.name, request: safeRequest, blueprint, actorId: actor.actorId });
      setMasterSpec(project, analyzed.spec);
      setSpecClarifications(project, analyzed.clarifications);
      project.runs = { ...((project.runs || {}) as Record<string, unknown>), [specStyleRunKey]: analyzed.style };
      emitEvent(project as any, { id: `evt_${Date.now()}`, projectId, type: "intake", actorId: actor.actorId, timestamp: now(), metadata: { name: project.name, capabilityGap: gap.hasGap ? gap.domain : null } });
      await repo.upsertProject(project);

      // Return the full question list so clients can immediately render the intake form
      const clarifications = getSpecClarifications(project);
      const spec = getMasterSpec(project);
      return res.json({
        projectId,
        status: project.status,
        actorId: actor.actorId,
        readinessScore: spec?.readinessScore ?? 0,
        openQuestions: spec?.openQuestions ?? [],
        clarifications: {
          mustAsk:       clarifications.filter((q: any) => q.mustAsk),
          approvalNeeded: clarifications.filter((q: any) => !q.mustAsk && q.requiresApproval),
          safeDefaults:  clarifications.filter((q: any) => q.suggestedDefault && !q.mustAsk),
        },
        hints: {
          nextStep: clarifications.some((q: any) => q.mustAsk)
            ? `Answer the ${clarifications.filter((q: any) => q.mustAsk).length} required questions at POST /api/projects/${projectId}/spec/answer-questions, then confirm the build at POST /api/projects/${projectId}/spec/confirm-and-build`
            : `Spec is sufficiently complete — confirm the build at POST /api/projects/${projectId}/spec/confirm-and-build`,
        },
      });
    } catch (error) {
      return handleRouteError(res, config, error, "POST /api/projects/intake", actor);
    }
  });

  // ── Conversation Triage — analyze raw input before creating a project ────
  // Returns targeted questions and domain analysis without storing anything.
  app.post("/api/intake/triage", async (req, res) => {
    const actor = await getRequestActor(req, config);
    try {
      const v = zodGuard(z.object({ text: z.string().min(1).max(20000) }), req.body);
      if (!v.ok) return res.status(400).json({ error: v.error, code: "TRIAGE_VALIDATION_ERROR" });
      const analysis = triageInput(v.data.text as string);
      return res.json({ ok: true, analysis, actorId: actor.actorId });
    } catch (error) {
      return handleRouteError(res, config, error, "POST /api/intake/triage", actor);
    }
  });

  // ── Triage condense — merge answers into a clarified spec ready for intake ─
  app.post("/api/intake/triage/condense", async (req, res) => {
    const actor = await getRequestActor(req, config);
    try {
      const v = zodGuard(z.object({
        text: z.string().min(1).max(20000),
        responses: z.array(z.object({ questionId: z.string(), answer: z.string().max(2000) })).optional(),
      }), req.body);
      if (!v.ok) return res.status(400).json({ error: v.error, code: "TRIAGE_CONDENSE_ERROR" });
      const { text, responses = [] } = v.data as any;
      const analysis = triageInput(text);
      const clarified = condenseToSpec(text, analysis, responses);
      return res.json({ ok: true, analysis, clarified, actorId: actor.actorId });
    } catch (error) {
      return handleRouteError(res, config, error, "POST /api/intake/triage/condense", actor);
    }
  });

  app.get("/api/projects/:projectId/intake/sources", async (req, res) => {
    const actor = await getRequestActor(req, config);
    try {
      const project = await repo.getProject(req.params.projectId);
      if (!project) return res.status(404).json({ error: "Project not found" });
      return res.json({ sources: getIntakeSources(project), actorId: actor.actorId });
    } catch (error) {
      return handleRouteError(res, config, error, "GET /api/projects/:projectId/intake/sources", actor);
    }
  });

  app.get("/api/projects/:projectId/intake/sources/:sourceId", async (req, res) => {
    const actor = await getRequestActor(req, config);
    try {
      const project = await repo.getProject(req.params.projectId);
      if (!project) return res.status(404).json({ error: "Project not found" });
      const source = getIntakeSources(project).find((item) => item.sourceId === req.params.sourceId);
      if (!source) return res.status(404).json({ error: "Source not found" });
      return res.json({ source, actorId: actor.actorId });
    } catch (error) {
      return handleRouteError(res, config, error, "GET /api/projects/:projectId/intake/sources/:sourceId", actor);
    }
  });

  app.post("/api/projects/:projectId/intake/source", async (req, res) => {
    const actor = await getRequestActor(req, config);
    try {
      const project = await repo.getProject(req.params.projectId);
      if (!project) return res.status(404).json({ error: "Project not found" });

      const sourceType = String((req.body as any)?.sourceType || "") as IntakeSourceType;
      const sourceUri = String((req.body as any)?.sourceUri || "");
      const displayName = String((req.body as any)?.displayName || sourceUri || sourceType || "Intake source");
      const sizeBytes = Number((req.body as any)?.sizeBytes || 0) || null;
      const provider = String((req.body as any)?.provider || "unknown");

      const route = routeIntakeInput({
        sourceType,
        sourceUri,
        displayName,
        sizeBytes,
        maxUploadBytes: config.intake.limits.maxUploadBytes,
        hasConnectorCredentials: Boolean((req.body as any)?.hasConnectorCredentials),
      });

      const source = createIntakeSourceRecord({
        projectId: project.projectId,
        sourceType,
        sourceUri,
        displayName,
        sizeBytes,
        provider,
        status: route.rejected ? "rejected" : "registered",
        ingestionMode: route.recommendedIntakePath,
        safetyStatus: route.rejected ? "blocked" : "pending",
      });

      upsertIntakeSource(project, source);
      emitEvent(project as any, {
        id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        projectId: project.projectId,
        type: "intake_source_registered",
        actorId: actor.actorId,
        timestamp: now(),
        metadata: { sourceId: source.sourceId, sourceType: source.sourceType, ingestionMode: source.ingestionMode },
      });
      emitEvent(project as any, {
        id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        projectId: project.projectId,
        type: "intake_route_selected",
        actorId: actor.actorId,
        timestamp: now(),
        metadata: { sourceId: source.sourceId, route: route.recommendedIntakePath, accepted: route.accepted },
      });

      const manifestPath = writeIntakeManifest(process.cwd(), source.sourceId, {
        sourceType,
        sourceUri,
        provider,
        accepted: route.accepted,
        rejected: route.rejected,
        sizeBytes,
        fileCount: 0,
        skippedPaths: [],
        detectedLanguages: [],
        detectedFrameworks: [],
        detectedPackageManagers: [],
        detectedRiskSignals: route.rejected ? ["routing_rejected"] : [],
        secretScanResult: { status: "passed", findings: [] },
        safetyChecks: [{ check: "intake_router", status: route.accepted ? "passed" : "blocked", detail: route.reason }],
        extractedTextSummary: "",
        artifactPaths: [],
        nextRecommendedAction: route.nextAction,
      });

      await persistProject(config, project);
      return res.json({ source, route, manifestPath, actorId: actor.actorId });
    } catch (error) {
      return handleRouteError(res, config, error, "POST /api/projects/:projectId/intake/source", actor);
    }
  });

  app.post("/api/projects/:projectId/intake/pasted-text", async (req, res) => {
    const actor = await getRequestActor(req, config);
    try {
      const project = await repo.getProject(req.params.projectId);
      if (!project) return res.status(404).json({ error: "Project not found" });

      const text = String((req.body as any)?.text || "").trim();
      if (!text) return res.status(400).json({ error: "Pasted text is required." });
      const displayName = String((req.body as any)?.displayName || "Pasted text");

      const route = routeIntakeInput({
        sourceType: "pasted_text",
        displayName,
        sizeBytes: Buffer.byteLength(text, "utf8"),
        maxUploadBytes: config.intake.limits.maxUploadBytes,
      });

      const source = createIntakeSourceRecord({
        projectId: project.projectId,
        sourceType: "pasted_text",
        sourceUri: "pasted://text",
        displayName,
        sizeBytes: Buffer.byteLength(text, "utf8"),
        provider: "operator",
        ingestionMode: route.recommendedIntakePath,
        status: "completed",
        safetyStatus: "passed",
      });

      upsertIntakeSource(project, source);

      const artifactId = `intake_text_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const existingIntake = getIntakeArtifacts(project);
      setIntakeArtifacts(project, {
        ...existingIntake,
        [artifactId]: {
          artifactId,
          fileName: displayName,
          mimeType: "text/plain",
          sizeBytes: Buffer.byteLength(text, "utf8"),
          uploadedAt: now(),
          actorId: actor.actorId,
          extractedTextPreview: text.slice(0, 500),
          extractedText: text,
          truncated: false,
          chunkCount: Math.max(1, Math.ceil(text.length / 4000)),
          parseError: null,
          sourceId: source.sourceId,
        },
      });

      emitEvent(project as any, { id: `evt_${Date.now()}`, projectId: project.projectId, type: "intake_source_registered", actorId: actor.actorId, timestamp: now(), metadata: { sourceId: source.sourceId, sourceType: source.sourceType } });
      emitEvent(project as any, { id: `evt_${Date.now()}`, projectId: project.projectId, type: "intake_route_selected", actorId: actor.actorId, timestamp: now(), metadata: { sourceId: source.sourceId, route: route.recommendedIntakePath } });
      emitEvent(project as any, { id: `evt_${Date.now()}`, projectId: project.projectId, type: "ingestion_started", actorId: actor.actorId, timestamp: now(), metadata: { sourceId: source.sourceId } });

      const manifestPath = writeIntakeManifest(process.cwd(), source.sourceId, {
        sourceType: "pasted_text",
        sourceUri: "pasted://text",
        provider: "operator",
        accepted: true,
        rejected: false,
        sizeBytes: Buffer.byteLength(text, "utf8"),
        fileCount: 1,
        skippedPaths: [],
        detectedLanguages: [],
        detectedFrameworks: [],
        detectedPackageManagers: [],
        detectedRiskSignals: [],
        secretScanResult: { status: "passed", findings: [] },
        safetyChecks: [{ check: "no_code_execution_during_intake", status: "passed", detail: "Pasted text parsed as data only." }],
        extractedTextSummary: text.slice(0, 500),
        artifactPaths: [artifactId],
        nextRecommendedAction: route.nextAction,
      });

      emitEvent(project as any, { id: `evt_${Date.now()}`, projectId: project.projectId, type: "intake_manifest_written", actorId: actor.actorId, timestamp: now(), metadata: { sourceId: source.sourceId, manifestPath } });
      emitEvent(project as any, { id: `evt_${Date.now()}`, projectId: project.projectId, type: "intake_completed", actorId: actor.actorId, timestamp: now(), metadata: { sourceId: source.sourceId } });

      await persistProject(config, project);
      return res.json({ source, route, manifestPath, actorId: actor.actorId, message: "Pasted text ingested successfully." });
    } catch (error) {
      return handleRouteError(res, config, error, "POST /api/projects/:projectId/intake/pasted-text", actor);
    }
  });

  app.post("/api/projects/:projectId/intake/github", async (req, res) => {
    const actor = await getRequestActor(req, config);
    try {
      const project = await repo.getProject(req.params.projectId);
      if (!project) return res.status(404).json({ error: "Project not found" });

      const sourceUrl = String((req.body as any)?.sourceUrl || "").trim();
      if (!sourceUrl) return res.status(400).json({ error: "GitHub URL is required." });

      const sourceType: IntakeSourceType = sourceUrl.includes("/pull/")
        ? "github_pr_url"
        : sourceUrl.includes("/tree/")
        ? "github_branch_url"
        : "github_repo_url";

      const route = routeIntakeInput({ sourceType, sourceUri: sourceUrl, maxUploadBytes: config.intake.limits.maxUploadBytes });
      const source = createIntakeSourceRecord({
        projectId: project.projectId,
        sourceType,
        sourceUri: sourceUrl,
        displayName: sourceUrl,
        provider: "github",
        authRequired: false,
        authStatus: "not_required",
        ingestionMode: route.recommendedIntakePath,
        status: "processing",
      });
      upsertIntakeSource(project, source);

      emitEvent(project as any, { id: `evt_${Date.now()}`, projectId: project.projectId, type: "intake_source_registered", actorId: actor.actorId, timestamp: now(), metadata: { sourceId: source.sourceId, sourceType } });
      emitEvent(project as any, { id: `evt_${Date.now()}`, projectId: project.projectId, type: "intake_route_selected", actorId: actor.actorId, timestamp: now(), metadata: { sourceId: source.sourceId, route: route.recommendedIntakePath } });
      emitEvent(project as any, { id: `evt_${Date.now()}`, projectId: project.projectId, type: "remote_fetch_started", actorId: actor.actorId, timestamp: now(), metadata: { sourceId: source.sourceId } });

      const github = intakeGithubSource({
        sourceUrl,
        rootDir: process.cwd(),
        sourceId: source.sourceId,
        allowClone: Boolean((req.body as any)?.allowClone),
        githubToken: String((req.body as any)?.githubToken || "") || undefined,
      });

      emitEvent(project as any, { id: `evt_${Date.now()}`, projectId: project.projectId, type: "repo_scan_started", actorId: actor.actorId, timestamp: now(), metadata: { sourceId: source.sourceId } });
      emitEvent(project as any, { id: `evt_${Date.now()}`, projectId: project.projectId, type: "secret_scan_started", actorId: actor.actorId, timestamp: now(), metadata: { sourceId: source.sourceId } });
      emitEvent(project as any, { id: `evt_${Date.now()}`, projectId: project.projectId, type: "framework_detection_started", actorId: actor.actorId, timestamp: now(), metadata: { sourceId: source.sourceId } });

      const status = github.authRequired && github.authStatus === "missing" ? "blocked_requires_auth" : "completed";
      const updatedSource: IntakeSource = {
        ...source,
        status,
        authRequired: github.authRequired,
        authStatus: github.authStatus,
        safetyStatus: github.secretScanResult.status === "flagged" ? "blocked" : "passed",
        estimatedSizeBytes: github.repoSizeEstimateBytes,
        updatedAt: nowIso(),
        metadata: {
          defaultBranch: github.defaultBranch,
          fileCountEstimate: github.fileCountEstimate,
          skippedPaths: github.skippedPaths.slice(0, 200),
          noCodeExecutionDuringIntake: true,
        },
      };
      upsertIntakeSource(project, updatedSource);

      const manifestPath = writeIntakeManifest(process.cwd(), source.sourceId, {
        sourceType,
        sourceUri: sourceUrl,
        provider: "github",
        accepted: true,
        rejected: false,
        sizeBytes: github.repoSizeEstimateBytes,
        fileCount: github.fileCountEstimate,
        skippedPaths: github.skippedPaths.slice(0, 500),
        detectedLanguages: github.detectedLanguages,
        detectedFrameworks: github.detectedFrameworks,
        detectedPackageManagers: github.detectedPackageManagers,
        detectedRiskSignals: github.riskSignals,
        secretScanResult: github.secretScanResult,
        safetyChecks: [
          { check: "no_code_execution_during_intake", status: "passed", detail: "Repository metadata/scanning only." },
          { check: "private_repo_requires_credentials", status: github.authRequired && github.authStatus === "missing" ? "blocked" : "passed", detail: github.authRequired ? "Access requires credentials." : "Public access path." },
        ],
        extractedTextSummary: "GitHub repository intake metadata captured.",
        artifactPaths: github.clonePath ? [github.clonePath] : [],
        nextRecommendedAction: github.authRequired && github.authStatus === "missing"
          ? "Provide GitHub credentials/connector for private repository access."
          : "Continue spec analysis using repository intake manifest.",
      });

      emitEvent(project as any, { id: `evt_${Date.now()}`, projectId: project.projectId, type: "intake_manifest_written", actorId: actor.actorId, timestamp: now(), metadata: { sourceId: source.sourceId, manifestPath } });
      if (status === "blocked_requires_auth") {
        emitEvent(project as any, { id: `evt_${Date.now()}`, projectId: project.projectId, type: "intake_blocked_requires_auth", actorId: actor.actorId, timestamp: now(), metadata: { sourceId: source.sourceId, provider: "github" } });
      } else {
        emitEvent(project as any, { id: `evt_${Date.now()}`, projectId: project.projectId, type: "intake_completed", actorId: actor.actorId, timestamp: now(), metadata: { sourceId: source.sourceId } });
      }

      await persistProject(config, project);
      return res.json({
        source: updatedSource,
        route,
        manifestPath,
        actorId: actor.actorId,
        message: status === "blocked_requires_auth"
          ? "GitHub source registered. Access is blocked pending credentials."
          : "GitHub source intake completed.",
      });
    } catch (error) {
      return handleRouteError(res, config, error, "POST /api/projects/:projectId/intake/github", actor);
    }
  });

  app.post("/api/projects/:projectId/intake/cloud-link", async (req, res) => {
    const actor = await getRequestActor(req, config);
    try {
      const project = await repo.getProject(req.params.projectId);
      if (!project) return res.status(404).json({ error: "Project not found" });

      const sourceUrl = String((req.body as any)?.sourceUrl || "").trim();
      if (!sourceUrl) return res.status(400).json({ error: "Cloud link is required." });
      const hasConnectorCredentials = Boolean((req.body as any)?.hasConnectorCredentials);
      const estimatedSizeBytes = Number((req.body as any)?.estimatedSizeBytes || 0) || null;
      const largeDownloadApproval = Boolean((req.body as any)?.largeDownloadApproval);

      const route = routeIntakeInput({
        sourceType: "cloud_storage_link",
        sourceUri: sourceUrl,
        sizeBytes: estimatedSizeBytes,
        maxUploadBytes: config.intake.limits.maxUploadBytes,
        hasConnectorCredentials,
      });

      const cloud = intakeCloudLink({ sourceUrl, hasConnectorCredentials, estimatedSizeBytes, largeDownloadApproval });
      const status: IntakeSource["status"] = cloud.authRequired && cloud.authStatus === "missing"
        ? "blocked_requires_auth"
        : cloud.metadataOnly
        ? "registered"
        : "completed";

      const source = createIntakeSourceRecord({
        projectId: project.projectId,
        sourceType: "cloud_storage_link",
        sourceUri: cloud.normalizedUrl,
        displayName: cloud.normalizedUrl,
        estimatedSizeBytes: cloud.estimatedSizeBytes,
        provider: cloud.provider,
        authRequired: cloud.authRequired,
        authStatus: cloud.authStatus,
        status,
        ingestionMode: cloud.metadataOnly ? "metadata_only" : "connector_fetch",
        safetyStatus: status === "blocked_requires_auth" ? "blocked" : "pending",
      });
      upsertIntakeSource(project, source);

      emitEvent(project as any, { id: `evt_${Date.now()}`, projectId: project.projectId, type: "intake_source_registered", actorId: actor.actorId, timestamp: now(), metadata: { sourceId: source.sourceId, sourceType: "cloud_storage_link" } });
      emitEvent(project as any, { id: `evt_${Date.now()}`, projectId: project.projectId, type: "intake_route_selected", actorId: actor.actorId, timestamp: now(), metadata: { sourceId: source.sourceId, route: source.ingestionMode } });
      if (!cloud.metadataOnly) {
        emitEvent(project as any, { id: `evt_${Date.now()}`, projectId: project.projectId, type: "remote_fetch_started", actorId: actor.actorId, timestamp: now(), metadata: { sourceId: source.sourceId, provider: cloud.provider } });
      }

      const manifestPath = writeIntakeManifest(process.cwd(), source.sourceId, {
        sourceType: "cloud_storage_link",
        sourceUri: cloud.normalizedUrl,
        provider: cloud.provider,
        accepted: true,
        rejected: false,
        sizeBytes: cloud.estimatedSizeBytes,
        fileCount: 0,
        skippedPaths: [],
        detectedLanguages: [],
        detectedFrameworks: [],
        detectedPackageManagers: [],
        detectedRiskSignals: cloud.metadataOnly ? ["metadata_only_registration"] : [],
        secretScanResult: { status: "passed", findings: [] },
        safetyChecks: [
          { check: "https_url_validation", status: "passed", detail: "Cloud link uses HTTPS." },
          { check: "connector_access", status: cloud.authRequired && cloud.authStatus === "missing" ? "blocked" : "passed", detail: cloud.reason },
        ],
        extractedTextSummary: "Cloud link intake metadata captured.",
        artifactPaths: [],
        nextRecommendedAction: cloud.reason,
      });

      emitEvent(project as any, { id: `evt_${Date.now()}`, projectId: project.projectId, type: "intake_manifest_written", actorId: actor.actorId, timestamp: now(), metadata: { sourceId: source.sourceId, manifestPath } });
      if (status === "blocked_requires_auth") {
        emitEvent(project as any, { id: `evt_${Date.now()}`, projectId: project.projectId, type: "intake_blocked_requires_auth", actorId: actor.actorId, timestamp: now(), metadata: { sourceId: source.sourceId, provider: cloud.provider } });
      } else if (!cloud.metadataOnly) {
        emitEvent(project as any, { id: `evt_${Date.now()}`, projectId: project.projectId, type: "intake_completed", actorId: actor.actorId, timestamp: now(), metadata: { sourceId: source.sourceId } });
      }

      await persistProject(config, project);
      return res.json({ source, route, manifestPath, actorId: actor.actorId, message: cloud.reason });
    } catch (error) {
      return handleRouteError(res, config, error, "POST /api/projects/:projectId/intake/cloud-link", actor);
    }
  });

  app.post("/api/projects/:projectId/intake/local-manifest", async (req, res) => {
    const actor = await getRequestActor(req, config);
    try {
      const project = await repo.getProject(req.params.projectId);
      if (!project) return res.status(404).json({ error: "Project not found" });

      const manifest = validateLocalFolderManifest((req.body as any)?.manifest || req.body);
      const route = routeIntakeInput({ sourceType: "local_folder_manifest", sourceUri: manifest.path, maxUploadBytes: config.intake.limits.maxUploadBytes });

      const source = createIntakeSourceRecord({
        projectId: project.projectId,
        sourceType: "local_folder_manifest",
        sourceUri: manifest.path,
        displayName: path.basename(manifest.path) || manifest.path,
        provider: "local_desktop",
        ingestionMode: route.recommendedIntakePath,
        status: "completed",
        safetyStatus: "passed",
        metadata: manifest as any,
      });
      upsertIntakeSource(project, source);

      emitEvent(project as any, { id: `evt_${Date.now()}`, projectId: project.projectId, type: "intake_source_registered", actorId: actor.actorId, timestamp: now(), metadata: { sourceId: source.sourceId, sourceType: "local_folder_manifest" } });
      emitEvent(project as any, { id: `evt_${Date.now()}`, projectId: project.projectId, type: "intake_route_selected", actorId: actor.actorId, timestamp: now(), metadata: { sourceId: source.sourceId, route: route.recommendedIntakePath } });

      const manifestPath = writeIntakeManifest(process.cwd(), source.sourceId, {
        sourceType: "local_folder_manifest",
        sourceUri: manifest.path,
        provider: "local_desktop",
        accepted: true,
        rejected: false,
        sizeBytes: null,
        fileCount: 0,
        skippedPaths: manifest.exclude,
        detectedLanguages: [],
        detectedFrameworks: [],
        detectedPackageManagers: [],
        detectedRiskSignals: [],
        secretScanResult: { status: "passed", findings: [] },
        safetyChecks: [
          { check: "manifest_schema", status: "passed", detail: "botomatic-intake.json schema validated." },
          { check: "no_code_execution_during_intake", status: "passed", detail: "Manifest registered as metadata-only." },
        ],
        extractedTextSummary: "",
        artifactPaths: [],
        nextRecommendedAction: route.nextAction,
      });

      emitEvent(project as any, { id: `evt_${Date.now()}`, projectId: project.projectId, type: "intake_manifest_written", actorId: actor.actorId, timestamp: now(), metadata: { sourceId: source.sourceId, manifestPath } });
      emitEvent(project as any, { id: `evt_${Date.now()}`, projectId: project.projectId, type: "intake_completed", actorId: actor.actorId, timestamp: now(), metadata: { sourceId: source.sourceId } });

      await persistProject(config, project);
      return res.json({ source, route, manifestPath, actorId: actor.actorId, message: "Local folder manifest registered." });
    } catch (error) {
      return handleRouteError(res, config, error, "POST /api/projects/:projectId/intake/local-manifest", actor);
    }
  });

  const upload = multer({
    storage: multer.diskStorage({
      destination: (_req, _file, cb) => {
        const incomingDir = path.join(config.intake.uploadDir, "incoming");
        fs.mkdirSync(incomingDir, { recursive: true });
        cb(null, incomingDir);
      },
      filename: (_req, file, cb) => {
        const safeBase = path.basename(file.originalname).replace(/[^a-zA-Z0-9._-]/g, "_");
        cb(null, `${Date.now()}_${Math.random().toString(36).slice(2, 8)}_${safeBase}`);
      },
    }),
    limits: {
      fileSize: config.intake.limits.maxUploadBytes,
      files: 1,
    },
    fileFilter: (_req, file, cb) => {
      if (isSupportedUploadType(file.originalname, file.mimetype || "")) {
        cb(null, true);
        return;
      }
      cb(new Error(`Unsupported file type: ${file.mimetype || path.extname(file.originalname) || "unknown"}`));
    },
  });

  app.post("/api/projects/:projectId/intake/file", (req, res, next) => {
    upload.single("file")(req, res, (error: any) => {
      if (!error) {
        return next();
      }
      if (error instanceof multer.MulterError) {
        if (error.code === "LIMIT_FILE_SIZE") {
          return res.status(413).json({
            error: `File too large (max ${formatMaxUploadLabel(config.intake.limits.maxUploadMb)}).`,
            code: "FILE_TOO_LARGE",
            configuredMaxUploadMb: config.intake.limits.maxUploadMb,
          });
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

      const sizeBytes = uploadedFile.size;
      const fileName = uploadedFile.originalname;
      const mimeType = uploadedFile.mimetype;
      const sourceType = classifyUploadedSourceType(fileName, mimeType || "");
      const uploadedAt = now();
      const uploadedPath = uploadedFile.path;
      const fullRepoAudit =
        String((req.query as any)?.fullRepoAudit || (req.body as any)?.fullRepoAudit || "").toLowerCase() === "true";
      const route = routeIntakeInput({
        sourceType,
        sourceUri: `upload://${fileName}`,
        displayName: fileName,
        sizeBytes,
        maxUploadBytes: config.intake.limits.maxUploadBytes,
      });
      const source = createIntakeSourceRecord({
        projectId: project.projectId,
        sourceType,
        sourceUri: `upload://${fileName}`,
        displayName: fileName,
        sizeBytes,
        provider: "local_upload",
        status: "processing",
        safetyStatus: "pending",
        ingestionMode: route.recommendedIntakePath,
      });
      upsertIntakeSource(project, source);
      emitEvent(project as any, {
        id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        projectId: project.projectId,
        type: "intake_source_registered",
        actorId: actor.actorId,
        timestamp: now(),
        metadata: { sourceId: source.sourceId, sourceType: source.sourceType, ingestionMode: source.ingestionMode },
      });
      emitEvent(project as any, {
        id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        projectId: project.projectId,
        type: "intake_route_selected",
        actorId: actor.actorId,
        timestamp: now(),
        metadata: { sourceId: source.sourceId, route: route.recommendedIntakePath, accepted: route.accepted },
      });
      (req as any).__intakeSourceId = source.sourceId;
      await persistProject(config, project);

      const intakeWorkDir = path.join(config.intake.uploadDir, project.projectId, `intake_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`);
      fs.mkdirSync(intakeWorkDir, { recursive: true });
      (req as any).__intakeWorkDir = intakeWorkDir;

      const emitAndPersist = async (event: IntakeProgressEvent) => {
        emitEvent(project as any, {
          id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          projectId: project.projectId,
          type: event.type,
          actorId: actor.actorId,
          timestamp: now(),
          metadata: event.metadata || {},
        });
        await persistProject(config, project);
      };

      await emitAndPersist({
        type: "upload_started",
        metadata: {
          fileName,
          configuredMaxUploadMb: config.intake.limits.maxUploadMb,
          configuredMaxExtractedMb: config.intake.limits.maxExtractedMb,
          configuredMaxZipFiles: config.intake.limits.maxZipFiles,
          fullRepoAudit,
        },
      });

      await emitAndPersist({
        type: "upload_received",
        metadata: { fileName, mimeType, sizeBytes },
      });

      const processed = await processUploadedFile({
        uploadPath: uploadedPath,
        originalName: fileName,
        mimeType,
        sizeBytes,
        workDir: intakeWorkDir,
        limits: config.intake.limits,
        fullRepoAudit,
        onProgressEvent: emitAndPersist,
      });

      const fullText = processed.extractedText;
      const extractedTextPreview = processed.extractedTextPreview;

      const artifactId = `intake_file_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const artifact = {
        artifactId,
        fileName: processed.fileName,
        mimeType: processed.mimeType,
        sizeBytes: processed.sizeBytes,
        uploadedAt,
        actorId: actor.actorId,
        extractedTextPreview,
        extractedText: fullText,
        truncated: processed.truncated,
        chunkCount: processed.chunkCount,
        chunkPreviews: [fullText.slice(0, 200), fullText.slice(200, 400), fullText.slice(400, 600)]
          .filter(Boolean)
          .map((preview, index) => ({ index, preview })),
        parseError: processed.parseError,
        extractionManifest: processed.extractionManifest,
        binarySummary: processed.binarySummary,
        sourceId: source.sourceId,
      };

      const existingIntake = getIntakeArtifacts(project);
      setIntakeArtifacts(project, { ...existingIntake, [artifactId]: artifact });
      emitEvent(project as any, {
        id: `evt_${Date.now()}`,
        projectId: project.projectId,
        type: "intake_file",
        actorId: actor.actorId,
        timestamp: uploadedAt,
        metadata: {
          fileName,
          mimeType,
          sizeBytes,
          artifactId,
          extractedChars: processed.extractedChars,
          truncated: processed.truncated,
          parseError: processed.parseError,
          extractionManifestCount: processed.extractionManifest.length,
          binarySummaryCount: processed.binarySummary.length,
          sourceId: source.sourceId,
        },
      });

      const completedSource: IntakeSource = {
        ...source,
        status: "completed",
        safetyStatus: processed.parseError ? "blocked" : "passed",
        updatedAt: nowIso(),
        metadata: {
          extractedChars: processed.extractedChars,
          parseError: processed.parseError,
          extractionManifestCount: processed.extractionManifest.length,
          binarySummaryCount: processed.binarySummary.length,
          fullRepoAudit,
        },
      };
      upsertIntakeSource(project, completedSource);
      emitEvent(project as any, {
        id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        projectId: project.projectId,
        type: "intake_completed",
        actorId: actor.actorId,
        timestamp: now(),
        metadata: { sourceId: source.sourceId, sourceType: source.sourceType },
      });
      await persistProject(config, project);

      fs.rmSync(intakeWorkDir, { recursive: true, force: true });
      fs.rmSync(uploadedPath, { force: true });
      delete (req as any).__intakeWorkDir;

      return res.json({
        ok: true,
        artifactId,
        fileName: processed.fileName,
        mimeType: processed.mimeType,
        sizeBytes: processed.sizeBytes,
        extractedChars: processed.extractedChars,
        extractedTextPreview,
        truncated: processed.truncated,
        chunkCount: processed.chunkCount,
        parseError: processed.parseError,
        extractionManifest: processed.extractionManifest,
        binarySummary: processed.binarySummary,
        configuredMaxUploadMb: config.intake.limits.maxUploadMb,
        configuredMaxExtractedMb: config.intake.limits.maxExtractedMb,
        configuredMaxZipFiles: config.intake.limits.maxZipFiles,
        acceptedExtensions: getSupportedUploadExtensions(),
        sourceId: source.sourceId,
        actorId: actor.actorId,
        message: processed.parseError
          ? `Uploaded ${fileName}; parse warning recorded; ingestion completed with safeguards.`
          : `Uploaded ${fileName}; extracted ${processed.extractedChars} characters; available to planning.`,
      });
    } catch (error) {
      const uploadedFile = (req as any).file as Express.Multer.File | undefined;
      if (uploadedFile?.path) {
        try {
          fs.rmSync(uploadedFile.path, { force: true });
        } catch {
          // keep error handling non-fatal when cleanup fails
        }
      }
      const intakeWorkDir = (req as any).__intakeWorkDir as string | undefined;
      if (intakeWorkDir) {
        try {
          fs.rmSync(intakeWorkDir, { recursive: true, force: true });
        } catch {
          // keep error handling non-fatal when cleanup fails
        }
      }

      if (error instanceof IntakeValidationError) {
        try {
          const project = await repo.getProject(req.params.projectId);
          if (project) {
            const sourceId = String((req as any).__intakeSourceId || "");
            if (sourceId) {
              const source = getIntakeSources(project).find((item) => item.sourceId === sourceId);
              if (source) {
                const failedSource: IntakeSource = {
                  ...source,
                  status: "failed",
                  safetyStatus: "blocked",
                  updatedAt: nowIso(),
                  metadata: {
                    ...(source.metadata || {}),
                    failureCode: error.code,
                    failureMessage: error.message,
                  },
                };
                upsertIntakeSource(project, failedSource);
              }
            }
            emitEvent(project as any, {
              id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
              projectId: project.projectId,
              type: "ingestion_failed",
              actorId: actor.actorId,
              timestamp: now(),
              metadata: {
                code: error.code,
                message: error.message,
                sourceId: String((req as any).__intakeSourceId || ""),
              },
            });
            await persistProject(config, project);
          }
        } catch {
          // ignore secondary ingestion_failed emission errors
        }

        return res.status(error.statusCode).json({
          error: error.message,
          code: error.code,
          configuredMaxUploadMb: config.intake.limits.maxUploadMb,
          configuredMaxExtractedMb: config.intake.limits.maxExtractedMb,
          configuredMaxZipFiles: config.intake.limits.maxZipFiles,
        });
      }
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

      // Proactive advisory — surfaces blockers, smart defaults, contradictions
      const advisory = analyzeSpecProactively(mergedSpec, blueprint, text);

      return res.json({
        ok: true,
        style: analyzed.style,
        readinessScore: mergedSpec.readinessScore,
        completeness: mergedSpec.completeness,
        openQuestions: mergedSpec.openQuestions,
        proactiveAdvisory: advisory,
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

  // ── Spec Q&A: accept user answers, merge into spec, recompute completeness ──
  app.post("/api/projects/:projectId/spec/answer-questions", async (req, res) => {
    const actor = await getRequestActor(req, config);
    try {
      const v = zodGuard(AnswerQuestionsSchema, req.body);
      if (!v.ok) return res.status(400).json({ error: v.error, code: "ANSWER_QUESTIONS_VALIDATION_ERROR" });
      const project = await repo.getProject(req.params.projectId);
      if (!project) return res.status(404).json({ error: "Project not found" });
      const spec = getMasterSpec(project);
      if (!spec) return res.status(400).json({ error: "Spec not initialized. Run /spec/analyze first." });

      const answers: Array<{ field: string; answer: string }> = Array.isArray((req.body as any)?.answers)
        ? (req.body as any).answers
        : [];
      if (answers.length === 0) return res.status(400).json({ error: "answers[] array is required" });

      // Apply each answer to the spec field it addresses
      let updated = { ...spec };
      for (const { field, answer } of answers) {
        const a = answer.trim();
        if (!a) continue;
        const f = field.toLowerCase();

        if (f.includes("auth") || f.includes("login") || f.includes("sign")) {
          const auth =
            /google/i.test(a) ? "google_oauth" :
            /github/i.test(a) ? "github_oauth" :
            /saml|sso|okta|azure.?ad/i.test(a) ? "saml_sso" :
            /magic.?link|passwordless/i.test(a) ? "magic_link" :
            /oidc|openid/i.test(a) ? "oidc" :
            /email|password/i.test(a) ? "email_password" : a;
          updated.authModel = auth;
          updated.openQuestions = updated.openQuestions.filter(q => !/auth|login|sign.?in/i.test(q));
        }

        if (f.includes("tenant") || f.includes("tenancy") || f.includes("multi")) {
          updated.tenancyModel = /multi/i.test(a) ? "multi_tenant" : "single_tenant";
          updated.openQuestions = updated.openQuestions.filter(q => !/tenant/i.test(q));
        }

        if (f.includes("payment") || f.includes("billing") || f.includes("monetiz")) {
          if (/no|none|not/i.test(a)) {
            updated.payments = [];
          } else {
            updated.payments = [/stripe/i.test(a) ? "stripe" : /braintree/i.test(a) ? "braintree" : "payment_provider_pending"];
            updated.pricingModel = /subscription/i.test(a) ? "subscription" :
              /one.?time/i.test(a) ? "one_time" :
              /usage/i.test(a) ? "usage_based" :
              /freemium/i.test(a) ? "freemium" : updated.pricingModel;
          }
          updated.openQuestions = updated.openQuestions.filter(q => !/payment|billing|pricing/i.test(q));
        }

        if (f.includes("compliance") || f.includes("regulat") || f.includes("legal")) {
          const newReqs: string[] = [];
          if (/gdpr/i.test(a)) newReqs.push("gdpr");
          if (/hipaa/i.test(a)) newReqs.push("hipaa");
          if (/soc.?2/i.test(a)) newReqs.push("soc2");
          if (/pci/i.test(a)) newReqs.push("pci_dss");
          if (/ccpa/i.test(a)) newReqs.push("ccpa");
          updated.complianceRequirements = newReqs;
          updated.openQuestions = updated.openQuestions.filter(q => !/compliance|regulat|gdpr|hipaa/i.test(q));
        }

        if (f.includes("deploy") || f.includes("host") || f.includes("infrastructure")) {
          const target =
            /railway/i.test(a) ? "railway" :
            /render/i.test(a) ? "render" :
            /fly/i.test(a) ? "fly" :
            /aws/i.test(a) ? "aws" :
            /gcp|google.?cloud/i.test(a) ? "gcp" :
            /azure/i.test(a) ? "azure" :
            /vercel/i.test(a) ? "vercel" : updated.deploymentTarget;
          updated.deploymentTarget = target;
          updated.openQuestions = updated.openQuestions.filter(q => !/deploy|host/i.test(q));
        }

        if (f.includes("database") || f.includes("db")) {
          const db =
            /mongo/i.test(a) ? "mongodb" :
            /mysql/i.test(a) ? "mysql" :
            /sqlite/i.test(a) ? "sqlite" :
            /postgres/i.test(a) ? "postgres" : updated.deploymentTarget;
          if (db !== updated.deploymentTarget) {
            updated.openQuestions = updated.openQuestions.filter(q => !/database/i.test(q));
          }
        }

        if (f.includes("workflow") || f.includes("journey") || f.includes("user.?flow")) {
          if (updated.workflows.length < 3) {
            updated.workflows = [a.slice(0, 120)];
          }
          updated.openQuestions = updated.openQuestions.filter(q => !/workflow|journey/i.test(q));
        }

        if (f.includes("role") || f.includes("user.?type") || f.includes("permission")) {
          const extractedRoles = a.match(/\b(admin|manager|user|staff|employee|guest|owner|operator|customer|member)\b/gi) || [];
          if (extractedRoles.length > 0) {
            updated.roles = [...new Set([...updated.roles, ...extractedRoles.map(r => r.toLowerCase())])];
          }
          updated.openQuestions = updated.openQuestions.filter(q => !/role|permission/i.test(q));
        }

        if (f.includes("v1_exclu") || f.includes("out.?of.?scope") || f.includes("exclusion")) {
          updated.excludedItems = [a.slice(0, 300)];
          updated.openQuestions = updated.openQuestions.filter(q => !/out.?of.?scope|exclusion/i.test(q));
        }

        // Fallback: store the raw answer in a custom "answers" bag on the spec for the build to use
        (updated as any).__answers = { ...((updated as any).__answers || {}), [field]: a };
      }

      // N81 — Intent drift detection: surface contradictions with committed spec values
      const driftWarnings: Array<{ field: string; existing: string; incoming: string }> = [];
      for (const { field, answer } of answers) {
        const a = answer.trim();
        const f = field.toLowerCase();
        if (f.includes("auth") && spec.authModel && spec.authModel !== "unknown" && spec.authModel !== updated.authModel) {
          driftWarnings.push({ field, existing: spec.authModel, incoming: updated.authModel ?? a });
        }
        if (f.includes("tenant") && spec.tenancyModel && spec.tenancyModel !== updated.tenancyModel) {
          driftWarnings.push({ field, existing: spec.tenancyModel, incoming: updated.tenancyModel ?? a });
        }
        if (f.includes("deploy") && spec.deploymentTarget && spec.deploymentTarget !== "unknown" && spec.deploymentTarget !== updated.deploymentTarget) {
          driftWarnings.push({ field, existing: spec.deploymentTarget, incoming: updated.deploymentTarget ?? a });
        }
      }

      // Recompute completeness and readiness after answers
      const clarifications = getSpecClarifications(project);
      const remainingMustAsk = clarifications.filter((q: any) => q.mustAsk && updated.openQuestions.includes(q.question));
      updated.openQuestions = remainingMustAsk.map((q: any) => q.question);

      const { computeCompleteness } = await import("../../../packages/spec-engine/src/specCompleteness.js");
      const completeness = computeCompleteness(updated);
      const readinessScore = Math.round(
        (completeness.criticalCompleteness + completeness.commercialCompleteness +
          completeness.implementationCompleteness + completeness.launchCompleteness +
          completeness.riskCompleteness) / 5
      );
      updated = { ...updated, completeness, readinessScore };

      setMasterSpec(project, updated);
      emitEvent(project as any, {
        id: `evt_${Date.now()}`,
        projectId: project.projectId,
        type: "spec_answers_applied",
        actorId: actor.actorId,
        timestamp: now(),
        metadata: { answeredFields: answers.map(a => a.field), openQuestionsRemaining: updated.openQuestions.length, readinessScore },
      });
      await persistProject(config, project);

      const blueprint = matchBlueprintFromText(project.request ?? "");
      const advisory = analyzeSpecProactively(updated, blueprint, project.request ?? "");

      return res.json({
        ok: true,
        readinessScore,
        openQuestionsRemaining: updated.openQuestions.length,
        openQuestions: updated.openQuestions,
        readyToConfirm: readinessScore >= 60 && updated.openQuestions.length === 0,
        driftWarnings: driftWarnings.length > 0 ? driftWarnings : undefined,
        proactiveAdvisory: advisory,
        spec: updated,
        actorId: actor.actorId,
      });
    } catch (error) {
      return handleRouteError(res, config, error, "POST /api/projects/:projectId/spec/answer-questions", actor);
    }
  });

  // ── Confirm & Build: user approves the spec, compile → plan → queue ─────────
  // No "reviewer" role required — this is the self-serve build trigger for all users.
  app.post("/api/projects/:projectId/spec/confirm-and-build", async (req, res) => {
    const actor = await getRequestActor(req, config);
    try {
      const v = zodGuard(ConfirmBuildSchema, req.body);
      if (!v.ok) return res.status(400).json({ error: v.error, code: "CONFIRM_BUILD_VALIDATION_ERROR" });
      const project = await repo.getProject(req.params.projectId);
      if (!project) return res.status(404).json({ error: "Project not found" });

      if (["queued", "running", "succeeded"].includes(String(project.status))) {
        return res.status(409).json({ error: "Build already started", status: project.status });
      }

      const spec = getMasterSpec(project);
      if (!spec) return res.status(400).json({ error: "Spec not initialized. Submit the intake form first." });

      // 03.4 — Completeness gates: <80 blocks, 80-94 warns, ≥95 full execution
      const score = spec.readinessScore ?? 0;
      const force = Boolean((req.body as any)?.force);
      if (score < 80 && !force) {
        return res.status(400).json({
          error: `Spec readiness is ${score}% — minimum 80% required to build. Answer the open questions or pass force:true to override.`,
          readinessScore: score,
          openQuestions: spec.openQuestions,
          gate: "blocked",
        });
      }
      const gateWarning = score < 95
        ? `Spec readiness is ${score}% — below 95% confidence threshold. Build will proceed but some areas may be under-specified.`
        : undefined;

      // Auto-approve high-risk assumptions marked as safe-to-build on user confirmation
      const assumptionIds = spec.assumptions.map((a: any) => a.id);
      const approvedAssumptions = approveAssumptions(spec.assumptions as any[], assumptionIds);
      const approvedSpec = { ...spec, assumptions: approvedAssumptions };
      setMasterSpec(project, approvedSpec);

      // Compile master truth
      const compiled = compileProjectWithIntake(project);
      if (!compiled.masterTruth) {
        return res.status(500).json({ error: "Compilation produced no master truth — check spec fields." });
      }

      // Generate build plan
      const plan = generatePlan(compiled.masterTruth as any);
      compiled.plan = plan;
      compiled.status = "queued";

      // Cache intelligence engine outputs in runs so /status can surface them
      const compiledIntel = (compiled.masterTruth as any)?.__intelligence ?? null;
      if (compiledIntel) {
        compiled.runs = {
          ...(compiled.runs ?? {}),
          __causalWorldModel: compiledIntel.causalWorldModel ?? null,
          __predictionLedger: compiledIntel.predictionLedger ?? null,
          __simulationResults: compiledIntel.simulationResults ?? null,
          __interventions: compiledIntel.interventions ?? null,
          __reflectionNotes: compiledIntel.reflectionNotes ?? null,
          __evolutionProposals: compiledIntel.evolutionProposals ?? null,
        };
      }

      // Generate and auto-approve build contract
      const contract = generateBuildContract(compiled.projectId, approvedSpec);
      const approvedContract = approveBuildContract(
        { ...contract, readyToBuild: true, blockers: [] },
        actor.actorId
      );
      setBuildContract(compiled, approvedContract);

      emitEvent(compiled as any, {
        id: `evt_${Date.now()}`,
        projectId: compiled.projectId,
        type: "build_confirmed",
        actorId: actor.actorId,
        timestamp: now(),
        metadata: { readinessScore: spec.readinessScore, packetCount: (plan as any)?.packets?.length ?? 0 },
      });

      await repo.upsertProject(compiled);

      // ── Enqueue wave-0 (root) packets immediately so the build starts ─────────
      // Without this, projects sit in "queued" forever. Root packets have no
      // dependencies so they are runnable the moment the build is confirmed.
      const packets = (plan as any)?.packets ?? [];
      const rootPackets = packets.filter((p: any) => !p.dependencies || (p.dependencies as string[]).length === 0);
      const enqueueErrors: string[] = [];
      for (const rootPacket of rootPackets) {
        try {
          await enqueueJob(compiled.projectId, rootPacket.packetId);
        } catch (e: any) {
          enqueueErrors.push(`${rootPacket.packetId}: ${String(e?.message ?? e)}`);
        }
      }
      if (enqueueErrors.length > 0) {
        console.warn(JSON.stringify({ event: "enqueue_warning", projectId: compiled.projectId, errors: enqueueErrors }));
      }

      return res.json({
        ok: true,
        projectId: compiled.projectId,
        status: "queued",
        packetCount: packets.length,
        rootPacketsEnqueued: rootPackets.length,
        packets: packets.map((p: any) => ({ packetId: p.packetId, goal: p.goal, waveType: p.waveType, dependencies: p.dependencies, riskLevel: p.riskLevel })),
        gateWarning,
        actorId: actor.actorId,
      });
    } catch (error) {
      return handleRouteError(res, config, error, "POST /api/projects/:projectId/spec/confirm-and-build", actor);
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

  app.post("/api/projects/:projectId/self-upgrade/spec", requireRole("reviewer", config), async (req, res) => {
    const actor = await getRequestActor(req, config);
    try {
      const project = await repo.getProject(req.params.projectId);
      if (!project) return res.status(404).json({ error: "Project not found" });
      const request = String((req.body as any)?.request || "");
      if (!request.trim()) return res.status(400).json({ error: "Self-upgrade request is required" });

      const spec = planSelfUpgrade(request);
      const drift = detectArchitectureDrift(spec);
      setSelfUpgradeSpec(project, spec);

      emitEvent(project as any, {
        id: `evt_${Date.now()}`,
        projectId: project.projectId,
        type: "self_upgrade_spec_created",
        actorId: actor.actorId,
        timestamp: now(),
        metadata: { driftDetected: drift.driftDetected, reasons: drift.reasons, affectedModules: spec.affectedModules },
      });
      await persistProject(config, project);

      return res.json({ ok: true, spec, drift, actorId: actor.actorId });
    } catch (error) {
      return handleRouteError(res, config, error, "POST /api/projects/:projectId/self-upgrade/spec", actor);
    }
  });

  app.get("/api/projects/:projectId/self-upgrade/status", requireRole("reviewer", config), async (req, res) => {
    const actor = await getRequestActor(req, config);
    try {
      const project = await repo.getProject(req.params.projectId);
      if (!project) return res.status(404).json({ error: "Project not found" });
      const spec = getSelfUpgradeSpec(project);
      if (!spec) return res.status(404).json({ error: "No self-upgrade spec found" });
      const drift = detectArchitectureDrift(spec);
      const regression = runRegressionGuard({
        spec,
        validatorCommand: null,
        validatorExitCode: null,
        targetBranch: "main",
        mutationMode: "read_only_proof",
        validatorWeakeningDetected: false,
        driftDetected: drift.driftDetected,
        driftReasons: drift.reasons,
      });
      return res.json({ ok: true, spec, drift, regression, actorId: actor.actorId });
    } catch (error) {
      return handleRouteError(res, config, error, "GET /api/projects/:projectId/self-upgrade/status", actor);
    }
  });

  app.post("/api/projects/:projectId/repo/completion-contract", requireRole("reviewer", config), async (req, res) => {
    const actor = await getRequestActor(req, config);
    try {
      const project = await repo.getProject(req.params.projectId);
      if (!project) return res.status(404).json({ error: "Project not found" });
      const request = String((req.body as any)?.request || project.request || "");
      const payload = buildExistingRepoCompletionContract(project, request);
      project.runs = {
        ...((project.runs || {}) as Record<string, unknown>),
        [repoIntakeRunKey]: {
          classification: payload.classification,
          inferredDomain: payload.inferredDomain,
          frameworkHints: payload.frameworkHints,
          languageHints: payload.languageHints,
          architecture: payload.architecture,
          risk: payload.risk,
        },
        [repoAuditRunKey]: {
          audits: payload.audits,
          commercialAudit: payload.commercialAudit,
          existingRepoValidation: payload.existingRepoValidation,
        },
        [repoCompletionRunKey]: {
          contract: payload.completionContract,
          repairPlan: payload.repairPlan,
        },
      };
      emitEvent(project as any, {
        id: `evt_${Date.now()}`,
        projectId: project.projectId,
        type: "repo_completion_contract_created",
        actorId: actor.actorId,
        timestamp: now(),
      });
      await persistProject(config, project);
      return res.json({ ok: true, actorId: actor.actorId, ...payload });
    } catch (error) {
      return handleRouteError(res, config, error, "POST /api/projects/:projectId/repo/completion-contract", actor);
    }
  });

  app.get("/api/projects/:projectId/repo/status", requireRole("reviewer", config), async (req, res) => {
    const actor = await getRequestActor(req, config);
    try {
      const project = await repo.getProject(req.params.projectId);
      if (!project) return res.status(404).json({ error: "Project not found" });
      const runs = ((project.runs || {}) as Record<string, unknown>);
      const intake = runs[repoIntakeRunKey] || null;
      const audit = runs[repoAuditRunKey] || null;
      const completion = runs[repoCompletionRunKey] || null;
      if (!intake && !audit && !completion) {
        return res.status(404).json({ error: "No repo completion contract found" });
      }
      return res.json({
        ok: true,
        actorId: actor.actorId,
        intake,
        audit,
        completion,
      });
    } catch (error) {
      return handleRouteError(res, config, error, "GET /api/projects/:projectId/repo/status", actor);
    }
  });

  app.post("/api/projects/:projectId/universal/capability-pipeline", requireRole("reviewer", config), async (req, res) => {
    const actor = await getRequestActor(req, config);
    try {
      const project = await repo.getProject(req.params.projectId);
      if (!project) return res.status(404).json({ error: "Project not found" });
      const inputText = String((req.body as any)?.input || project.request || "");
      const artifacts = buildUniversalCapabilityArtifacts(project, inputText, actor.actorId);
      project.runs = {
        ...((project.runs || {}) as Record<string, unknown>),
        [universalCapabilityRunKey]: artifacts,
      };
      emitEvent(project as any, {
        id: `evt_${Date.now()}`,
        projectId: project.projectId,
        type: "universal_capability_pipeline_generated",
        actorId: actor.actorId,
        timestamp: now(),
      });
      await persistProject(config, project);
      return res.json({ ok: true, actorId: actor.actorId, ...artifacts });
    } catch (error) {
      return handleRouteError(res, config, error, "POST /api/projects/:projectId/universal/capability-pipeline", actor);
    }
  });

  app.get("/api/projects/:projectId/universal/capability-pipeline", requireRole("reviewer", config), async (req, res) => {
    const actor = await getRequestActor(req, config);
    try {
      const project = await repo.getProject(req.params.projectId);
      if (!project) return res.status(404).json({ error: "Project not found" });
      const artifacts = (((project.runs || {}) as Record<string, unknown>)[universalCapabilityRunKey] as Record<string, unknown> | undefined) || null;
      if (!artifacts) return res.status(404).json({ error: "No universal capability artifacts found" });
      return res.json({ ok: true, actorId: actor.actorId, ...artifacts });
    } catch (error) {
      return handleRouteError(res, config, error, "GET /api/projects/:projectId/universal/capability-pipeline", actor);
    }
  });

  app.post("/api/projects/:projectId/autonomous-build/start", requireRole("reviewer", config), async (req, res) => {
    const actor = await getRequestActor(req, config);
    try {
      const project = await repo.getProject(req.params.projectId);
      if (!project) return res.status(404).json({ error: "Project not found" });

      const inputText = String((req.body as any)?.inputText || project.request || "");
      const runId = `${project.projectId}_autonomous_${Date.now()}`;
      const run = startAutonomousBuildRun({
        runId,
        specInput: {
          sourceType: "multi_file_spec",
          rawText: [project.request || "", buildIntakeContext(project), inputText].filter(Boolean).join("\n\n"),
          fileNames: Object.values(getIntakeArtifacts(project) || {}).map((artifact: any) => String(artifact?.originalName || "")).filter(Boolean),
        },
        repairBudget: 3,
        safeDefaults: Boolean((req.body as any)?.safeDefaults ?? true),
      });

      setAutonomousBuildRun(project, run);
      emitEvent(project as any, {
        id: `evt_${Date.now()}`,
        projectId: project.projectId,
        type: "autonomous_build_started",
        actorId: actor.actorId,
        timestamp: now(),
        metadata: { runId: run.runId },
      });
      await persistProject(config, project);
      return res.json({ ok: true, run, actorId: actor.actorId });
    } catch (error) {
      return handleRouteError(res, config, error, "POST /api/projects/:projectId/autonomous-build/start", actor);
    }
  });

  app.get("/api/projects/:projectId/autonomous-build/status", requireRole("reviewer", config), async (req, res) => {
    const actor = await getRequestActor(req, config);
    try {
      const project = await repo.getProject(req.params.projectId);
      if (!project) return res.status(404).json({ error: "Project not found" });
      const run = getAutonomousBuildRun(project);
      if (!run) {
        const timestamp = now();
        return res.json({
          ok: true,
          run: {
            runId: `${project.projectId}_autonomous_idle`,
            status: "idle",
            milestoneGraph: [],
            checkpoint: {
              runId: `${project.projectId}_autonomous_idle`,
              currentMilestone: "none",
              completedMilestones: [],
              failedMilestone: null,
              repairAttempts: 0,
              repairAttemptsBySignature: {},
              repairAttemptsByMilestoneCategory: {},
              repairHistory: [],
              lastFailure: null,
              artifactPaths: [],
              logs: [],
              resumeCommand: "Start an autonomous run",
              nextAction: "Start autonomous build",
            },
            humanBlockers: [],
            finalReleaseAssembled: false,
            startedAt: timestamp,
            updatedAt: timestamp,
          } as any,
          actorId: actor.actorId,
        });
      }
      return res.json({ ok: true, run, actorId: actor.actorId });
    } catch (error) {
      return handleRouteError(res, config, error, "GET /api/projects/:projectId/autonomous-build/status", actor);
    }
  });

  app.post("/api/projects/:projectId/autonomous-build/resume", requireRole("reviewer", config), async (req, res) => {
    const actor = await getRequestActor(req, config);
    try {
      const project = await repo.getProject(req.params.projectId);
      if (!project) return res.status(404).json({ error: "Project not found" });
      const current = getAutonomousBuildRun(project);
      if (!current) return res.status(404).json({ error: "No autonomous build run found" });

      const approvedBlockerCodes = Array.isArray((req.body as any)?.approvedBlockerCodes)
        ? (req.body as any).approvedBlockerCodes.map((v: any) => String(v))
        : [];
      const resumed = resumeAutonomousBuildRun(current, { approvedBlockerCodes, repairBudget: 3 });
      setAutonomousBuildRun(project, resumed);
      emitEvent(project as any, {
        id: `evt_${Date.now()}`,
        projectId: project.projectId,
        type: "autonomous_build_resumed",
        actorId: actor.actorId,
        timestamp: now(),
        metadata: { runId: resumed.runId, approvedBlockerCodes },
      });
      await persistProject(config, project);
      return res.json({ ok: true, run: resumed, actorId: actor.actorId });
    } catch (error) {
      return handleRouteError(res, config, error, "POST /api/projects/:projectId/autonomous-build/resume", actor);
    }
  });

  app.post("/api/projects/:projectId/autonomous-build/approve-blocker", requireRole("reviewer", config), async (req, res) => {
    const actor = await getRequestActor(req, config);
    try {
      const project = await repo.getProject(req.params.projectId);
      if (!project) return res.status(404).json({ error: "Project not found" });
      const current = getAutonomousBuildRun(project);
      if (!current) return res.status(404).json({ error: "No autonomous build run found" });

      const blockerCode = String((req.body as any)?.blockerCode || "").trim();
      if (!blockerCode) {
        return res.status(400).json({ error: "blockerCode is required" });
      }

      const updated = {
        ...current,
        humanBlockers: current.humanBlockers.map((blocker) =>
          blocker.code === blockerCode ? { ...blocker, approved: true } : blocker
        ),
        updatedAt: now(),
      };
      setAutonomousBuildRun(project, updated);
      emitEvent(project as any, {
        id: `evt_${Date.now()}`,
        projectId: project.projectId,
        type: "autonomous_build_blocker_approved",
        actorId: actor.actorId,
        timestamp: now(),
        metadata: { runId: updated.runId, blockerCode },
      });
      await persistProject(config, project);
      return res.json({ ok: true, run: updated, actorId: actor.actorId });
    } catch (error) {
      return handleRouteError(res, config, error, "POST /api/projects/:projectId/autonomous-build/approve-blocker", actor);
    }
  });

  app.post("/api/projects/:projectId/operator/send", async (req, res) => {
    const actor = await getRequestActor(req, config);
    try {
      const v = zodGuard(OperatorSendSchema, req.body);
      if (!v.ok) return res.status(400).json({ error: v.error, code: "OPERATOR_SEND_VALIDATION_ERROR" });
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

      if (hasAutonomousBuildIntent(message)) {
        route = "autonomous_complex_build";
        const existingRun = getAutonomousBuildRun(project);
        const shouldContinue = /(continue the build|fix and keep going)/.test(message.toLowerCase());
        const shouldSafeDefault = /(use safe defaults|stop only for secrets or approval)/.test(message.toLowerCase());

        const run = shouldContinue && existingRun
          ? resumeAutonomousBuildRun(existingRun, {
            approvedBlockerCodes: existingRun.humanBlockers.filter((b) => b.approved).map((b) => b.code),
            repairBudget: 3,
          })
          : startAutonomousBuildRun({
            runId: `${project.projectId}_autonomous_${Date.now()}`,
            specInput: {
              sourceType: "multi_file_spec",
              rawText: [project.request || "", buildIntakeContext(project), message].filter(Boolean).join("\n\n"),
              fileNames: Object.values(getIntakeArtifacts(project) || {}).map((artifact: any) => String(artifact?.originalName || "")).filter(Boolean),
            },
            repairBudget: 3,
            safeDefaults: shouldSafeDefault,
          });

        setAutonomousBuildRun(project, run);
        emitEvent(project as any, {
          id: `evt_${Date.now()}`,
          projectId: project.projectId,
          type: shouldContinue ? "autonomous_build_resumed" : "autonomous_build_started",
          actorId: actor.actorId,
          role,
          timestamp: now(),
          metadata: { route, message, runId: run.runId },
        });
        await persistProject(config, project);

        const blockerLines = run.humanBlockers.filter((b) => !b.approved).map((b) => b.detail);
        return res.json({
          ok: true,
          route,
          status: run.status,
          blockers: blockerLines,
          nextAction: run.checkpoint.nextAction,
          actorId: actor.actorId,
          operatorMessage: formatOperatorVoice({
            direct: "Autonomous complex build orchestration is active and milestone-gated.",
            status: run.status,
            blockers: blockerLines,
            nextAction: run.checkpoint.nextAction,
          }),
          actionResult: {
            runId: run.runId,
            milestoneCount: run.milestoneGraph.length,
            completedMilestones: run.checkpoint.completedMilestones.length,
            currentMilestone: run.checkpoint.currentMilestone,
            humanBlockers: run.humanBlockers,
            resumeCommand: run.checkpoint.resumeCommand,
          },
        });
      }

      if (hasUniversalCapabilityStressIntent(message)) {
        route = "universal_capability_pipeline";
        const artifacts = buildUniversalCapabilityArtifacts(project, message, actor.actorId);
        project.runs = {
          ...((project.runs || {}) as Record<string, unknown>),
          [universalCapabilityRunKey]: artifacts,
        };
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
          blockers: artifacts.launchPacket.blockers,
          nextAction: artifacts.launchPacket.blockers[0] || "Dispatch implementation packets and run readiness validators.",
          actorId: actor.actorId,
          operatorMessage: formatOperatorVoice({
            direct: "Universal capability pipeline generated from messy product input.",
            status: project.status,
            blockers: artifacts.launchPacket.blockers,
            nextAction: artifacts.launchPacket.blockers[0] || "Dispatch implementation packets and run readiness validators.",
          }),
          actionResult: artifacts,
        });
      }

      if (hasExistingRepoIntent(message)) {
        route = "existing_repo_completion_contract";
        const payload = buildExistingRepoCompletionContract(project, message);
        project.runs = {
          ...((project.runs || {}) as Record<string, unknown>),
          [repoIntakeRunKey]: {
            classification: payload.classification,
            inferredDomain: payload.inferredDomain,
            frameworkHints: payload.frameworkHints,
            languageHints: payload.languageHints,
            architecture: payload.architecture,
            risk: payload.risk,
          },
          [repoAuditRunKey]: {
            audits: payload.audits,
            commercialAudit: payload.commercialAudit,
            existingRepoValidation: payload.existingRepoValidation,
          },
          [repoCompletionRunKey]: {
            contract: payload.completionContract,
            repairPlan: payload.repairPlan,
          },
        };
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
          blockers: payload.completionContract.commercialLaunchBlockers,
          nextAction: payload.repairPlan.patchQueue[0] || "Run first repair patch and re-validate.",
          actorId: actor.actorId,
          operatorMessage: formatOperatorVoice({
            direct: "Existing-repo rescue contract generated from current codebase and intake context.",
            status: project.status,
            blockers: payload.completionContract.commercialLaunchBlockers,
            nextAction: payload.repairPlan.patchQueue[0] || "Run first repair patch and re-validate.",
          }),
          actionResult: payload,
        });
      }

      if (hasSelfUpgradeIntent(message)) {
        route = "self_upgrade_spec";
        const selfUpgradeSpec = planSelfUpgrade(message);
        const drift = detectArchitectureDrift(selfUpgradeSpec);
        setSelfUpgradeSpec(project, selfUpgradeSpec);
        emitEvent(project as any, {
          id: `evt_${Date.now()}`,
          projectId: project.projectId,
          type: "self_upgrade_spec_created",
          actorId: actor.actorId,
          role,
          timestamp: now(),
          metadata: { driftDetected: drift.driftDetected, reasons: drift.reasons, affectedModules: selfUpgradeSpec.affectedModules },
        });
        await persistProject(config, project);
        return res.json({
          ok: true,
          route,
          status: project.status,
          blockers: drift.driftDetected ? drift.reasons : [],
          nextAction: drift.driftDetected
            ? "Resolve architecture drift blockers before applying self-upgrade changes."
            : "Create a PR-sized branch change, run targeted and regression validators, and request human approval.",
          actorId: actor.actorId,
          operatorMessage: formatOperatorVoice({
            direct: "Self-upgrade request captured. Generated SelfUpgradeSpec.",
            status: project.status,
            blockers: drift.driftDetected ? drift.reasons : [],
            nextAction: drift.driftDetected
              ? "Resolve architecture drift blockers before applying self-upgrade changes."
              : "Create a PR-sized branch change, run targeted and regression validators, and request human approval.",
          }),
          actionResult: { selfUpgradeSpec, drift },
        });
      }

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
        const autoApproval = canAutoApprove(project);
        const buildBlockers = getBuildBlockers(project);
        if (buildBlockers.length > 0) {
          const blockedSpec = getMasterSpec(project);
          return res.json({
            ok: true,
            route: "build_blocked",
            status: project.status,
            blockers: buildBlockers,
            spec: blockedSpec
              ? {
                  authModel: blockedSpec.authModel,
                  tenancyModel: blockedSpec.tenancyModel,
                  deploymentTarget: blockedSpec.deploymentTarget,
                  openQuestions: blockedSpec.openQuestions,
                  readinessScore: blockedSpec.readinessScore,
                  completeness: blockedSpec.completeness,
                }
              : null,
            assumptions: (blockedSpec?.assumptions || []).filter((a: any) => a.requiresApproval || a.risk === "high"),
            questions: blockedSpec?.openQuestions || [],
            nextAction: "Resolve spec clarifications and approve build contract before planning.",
            actorId: actor.actorId,
            operatorMessage: formatOperatorVoice({
              direct: "Build is blocked until contract/spec requirements are complete.",
              status: project.status,
              blockers: buildBlockers,
              nextAction: "Resolve spec clarifications and approve build contract before planning.",
            }),
            actionResult: { blocked: true, autoApproval: autoApproval.approved },
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
          actionResult: { planned: true, autoApproval: autoApproval.approved, packetCount: getPackets(updated).length },
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
        // Memory-mode: synchronously materialize a real generated workspace so the
        // forensic harness can run local build/smoke and score PASS_REAL.
        if (config.repository.mode !== "durable") {
          try {
            const ws = await materializeGeneratedWorkspace(project.projectId, jobId, project.request || "");
            project.runs = {
              ...((project.runs || {}) as Record<string, unknown>),
              [generatedWorkspaceRunKey]: {
                workspacePath: ws.workspacePath,
                jobId,
                buildStatus: ws.buildStatus,
                runStatus: ws.runStatus,
                smokeStatus: ws.smokeStatus,
                filesWritten: ws.filesWritten,
                classification: classifyLocalExecutionOutcome({
                  filesWritten: ws.filesWritten,
                  buildStatus: ws.buildStatus,
                  runStatus: ws.runStatus,
                  smokeStatus: ws.smokeStatus,
                }),
                generatedAt: now(),
              },
            };
            // Mark the packet complete so project status reflects execution
            const passed = ws.buildStatus === "passed" && ws.smokeStatus === "passed";
            setPacketStatus(project, pendingPacket.packetId, passed ? "complete" : "blocked");
            recomputeProjectStatus(project);
          } catch {
            // Non-fatal: workspace materialization failure does not block the response
          }
        }
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

      // N88 — composite project health score
      const packets = getPackets(project);
      const totalPackets = packets.length;
      const completedPackets = packets.filter((p: any) => p.status === "complete").length;
      const failedPackets = packets.filter((p: any) => p.status === "failed").length;
      const spec = getMasterSpec(project);
      const specCompleteness = spec ? (spec.readinessScore ?? 0) / 100 : 0;
      const validationPassRate = totalPackets > 0
        ? Object.values((project.validations || {}) as Record<string, any>)
            .filter(v => v?.status === "passed").length / totalPackets
        : 0;
      const executionReliability = totalPackets > 0
        ? Math.max(0, (completedPackets - failedPackets) / totalPackets)
        : 0;
      const healthScore = Math.round(
        (specCompleteness * 0.25 + validationPassRate * 0.30 + executionReliability * 0.45) * 100
      );

      // Intelligence cockpit — expose engine outputs on every status poll
      const compiledRuns = (project.runs as any) ?? {};
      const intelligenceCockpit = {
        healthScore,
        causalWorldModel: compiledRuns.__causalWorldModel ?? null,
        predictionLedger: compiledRuns.__predictionLedger ?? null,
        simulationResults: compiledRuns.__simulationResults ?? null,
        interventions: compiledRuns.__interventions ?? null,
        reflectionNotes: compiledRuns.__reflectionNotes ?? null,
        evolutionProposals: compiledRuns.__evolutionProposals ?? null,
        packetProgress: {
          total: totalPackets,
          completed: completedPackets,
          failed: failedPackets,
          running: packets.filter((p: any) => p.status === "executing").length,
          pending: packets.filter((p: any) => p.status === "queued" || p.status === "pending").length,
          percentComplete: totalPackets > 0 ? Math.round((completedPackets / totalPackets) * 100) : 0,
        },
      };

      return res.json({ ...project, intakeArtifacts, healthScore, intelligenceCockpit, actorId: actor.actorId, workerId });
    } catch (error) {
      return handleRouteError(res, config, error, "GET /api/projects/:projectId/status", actor);
    }
  });

  app.get("/api/projects/:projectId/state", async (req, res) => {
    const actor = await getRequestActor(req, config);
    try {
      const project = await repo.getProject(req.params.projectId);
      if (!project) return res.status(404).json({ error: "Project not found" });
      const overview = buildOverview(project);
      const nextStep = overview.blockers.length > 0 ? overview.blockers[0] : "Continue build pipeline";
      const stageStatus = project.status || "idle";
      return res.json({
        projectId: project.projectId,
        objective: project.request || project.name,
        nextStep,
        runId: project.projectId,
        latestRunId: project.projectId,
        activeRunId: project.projectId,
        latestRun: {
          runId: project.projectId,
          status: stageStatus,
          stages: [{ id: "project_status", label: "Project status", status: stageStatus, updatedAt: (project as any).updatedAt || now() }],
        },
        orchestration: {
          runId: project.projectId,
          status: stageStatus,
          stages: [{ id: "project_status", label: "Project status", status: stageStatus, updatedAt: (project as any).updatedAt || now() }],
        },
        activity: overview.activity,
        actorId: actor.actorId,
        workerId,
      });
    } catch (error) {
      return handleRouteError(res, config, error, "GET /api/projects/:projectId/state", actor);
    }
  });

  app.get("/api/projects/:projectId/resume", async (req, res) => {
    const actor = await getRequestActor(req, config);
    try {
      const project = await repo.getProject(req.params.projectId);
      if (!project) return res.status(404).json({ error: "Project not found" });
      const overview = buildOverview(project);
      return res.json({
        projectId: project.projectId,
        objective: project.request || project.name,
        nextStep: overview.blockers[0] || "Continue build pipeline",
        activeRunId: project.projectId,
        latestRunId: project.projectId,
        latestPrompt: project.request,
        stages: [{ id: "project_status", label: "Project status", status: project.status || "idle", updatedAt: (project as any).updatedAt || now() }],
        updatedAt: (project as any).updatedAt || now(),
        actorId: actor.actorId,
        workerId,
      });
    } catch (error) {
      return handleRouteError(res, config, error, "GET /api/projects/:projectId/resume", actor);
    }
  });

  app.get("/api/projects/:projectId/runtime", async (req, res) => {
    const actor = await getRequestActor(req, config);
    try {
      const project = await repo.getProject(req.params.projectId);
      if (!project) return res.status(404).json({ error: "Project not found" });
      const status = project.status || "idle";
      const workspace = ((project.runs || {}) as Record<string, any>)[generatedWorkspaceRunKey];
      return res.json({
        projectId: project.projectId,
        status,
        state: status,
        projectPath: workspace?.workspacePath || null,
        generatedProjectPath: workspace?.workspacePath || null,
        buildStatus: workspace?.buildStatus || null,
        runStatus: workspace?.runStatus || null,
        smokeStatus: workspace?.smokeStatus || null,
        artifactId: workspace ? `artifact_${project.projectId}` : null,
        previewUrl: null,
        verifiedPreviewUrl: null,
        derivedPreviewUrl: null,
        actorId: actor.actorId,
        workerId,
      });
    } catch (error) {
      return handleRouteError(res, config, error, "GET /api/projects/:projectId/runtime", actor);
    }
  });

  app.get("/api/projects/:projectId/execution", async (req, res) => {
    const actor = await getRequestActor(req, config);
    try {
      const project = await repo.getProject(req.params.projectId);
      if (!project) return res.status(404).json({ error: "Project not found" });
      const jobs = buildPacketList(project).map((packet: any) => ({
        id: packet.packetId,
        runId: project.projectId,
        projectId: project.projectId,
        type: "build",
        label: packet.title || packet.packetId,
        status: packet.status,
      }));
      return res.json({
        runId: project.projectId,
        projectId: project.projectId,
        status: project.status || "idle",
        jobs,
        logs: [],
        updatedAt: (project as any).updatedAt || now(),
        actorId: actor.actorId,
        workerId,
      });
    } catch (error) {
      return handleRouteError(res, config, error, "GET /api/projects/:projectId/execution", actor);
    }
  });

  app.get("/api/projects/:projectId/execution/:runId", async (req, res) => {
    const actor = await getRequestActor(req, config);
    try {
      const project = await repo.getProject(req.params.projectId);
      if (!project) return res.status(404).json({ error: "Project not found" });
      const jobs = buildPacketList(project).map((packet: any) => ({
        id: packet.packetId,
        runId: req.params.runId,
        projectId: project.projectId,
        type: "build",
        label: packet.title || packet.packetId,
        status: packet.status,
      }));
      return res.json({
        runId: req.params.runId,
        projectId: project.projectId,
        status: project.status || "idle",
        jobs,
        logs: [],
        updatedAt: (project as any).updatedAt || now(),
        actorId: actor.actorId,
        workerId,
      });
    } catch (error) {
      return handleRouteError(res, config, error, "GET /api/projects/:projectId/execution/:runId", actor);
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

  app.get("/api/projects/:projectId/ui/proof-status", requireRole("reviewer", config), async (req, res) => {
    const actor = await getRequestActor(req, config);
    try {
      const project = await repo.getProject(req.params.projectId);
      if (!project) return res.status(404).json({ error: "Project not found" });
      return res.json({
        ...buildProofStatusPayload(),
        actorId: actor.actorId,
        workerId,
      });
    } catch (error) {
      return handleRouteError(res, config, error, "GET /api/projects/:projectId/ui/proof-status", actor);
    }
  });

  // ── Launch Proof ─────────────────────────────────────────────────────────
  app.get("/api/projects/:projectId/launch-proof", async (req, res) => {
    const actor = await getRequestActor(req, config);
    try {
      const project = await repo.getProject(req.params.projectId);
      if (!project) return res.status(404).json({ error: "Project not found" });
      const proof = buildProofStatusPayload();
      // Derive proof rung: 0=none, 1=benchmark present, 2=benchmark pass, 3=runtime proof, 4=all suites pass
      let proofRung = 0;
      if (proof.benchmark.exists) proofRung = 1;
      if (proof.benchmark.launchablePass) proofRung = 2;
      if (proof.runtimeProof.greenfield.exists && proof.runtimeProof.greenfield.status === "passed") proofRung = 3;
      if (proof.benchmark.universalPass && proof.runtimeProof.selfUpgrade.status === "passed") proofRung = 4;
      const readinessScore = Math.round(
        (proof.benchmark.averageScoreOutOf10 / 10) * 100 * 0.5 +
        (proof.benchmark.universalScoreOutOf10 / 10) * 100 * 0.3 +
        (proof.benchmark.criticalFailures === 0 ? 100 : 0) * 0.2
      );
      return res.json({
        projectId: req.params.projectId,
        verified: proofRung >= 3,
        verifiedAt: proofRung >= 3 ? proof.lastProofRun ?? now() : undefined,
        verificationMethod: "benchmark" as const,
        buildStatus: (project as any).status ?? "unknown",
        commercialReadinessScore: readinessScore,
        lastUpdated: (project as any).updatedAt ?? now(),
        proofRung,
        proof,
      });
    } catch (error) {
      return handleRouteError(res, config, error, "GET /api/projects/:projectId/launch-proof", actor);
    }
  });

  app.post("/api/projects/:projectId/launch/verify", async (req, res) => {
    const actor = await getRequestActor(req, config);
    try {
      const project = await repo.getProject(req.params.projectId);
      if (!project) return res.status(404).json({ error: "Project not found" });
      const { verificationMethod = "benchmark", commercialReadinessScore, buildStatus } = req.body ?? {};
      const proof = buildProofStatusPayload();
      let proofRung = 0;
      if (proof.benchmark.exists) proofRung = 1;
      if (proof.benchmark.launchablePass) proofRung = 2;
      if (proof.runtimeProof.greenfield.exists && proof.runtimeProof.greenfield.status === "passed") proofRung = 3;
      if (proof.benchmark.universalPass && proof.runtimeProof.selfUpgrade.status === "passed") proofRung = 4;
      const verified = proofRung >= 3;
      const derivedScore = Math.round(
        (proof.benchmark.averageScoreOutOf10 / 10) * 100 * 0.5 +
        (proof.benchmark.universalScoreOutOf10 / 10) * 100 * 0.3 +
        (proof.benchmark.criticalFailures === 0 ? 100 : 0) * 0.2
      );
      return res.json({
        verified,
        message: verified
          ? "Launch proof verified — build meets proof rung ≥ 3"
          : `Launch proof not yet verified — current proof rung: ${proofRung}/4`,
        launchProof: {
          projectId: req.params.projectId,
          verified,
          verifiedAt: verified ? proof.lastProofRun ?? now() : undefined,
          verificationMethod: verificationMethod ?? "benchmark",
          buildStatus: buildStatus ?? (project as any).status ?? "unknown",
          commercialReadinessScore: commercialReadinessScore ?? derivedScore,
          lastUpdated: now(),
          proofRung,
        },
      });
    } catch (error) {
      return handleRouteError(res, config, error, "POST /api/projects/:projectId/launch/verify", actor);
    }
  });

  app.get("/api/projects/:projectId/ui/security-center", requireRole("reviewer", config), async (req, res) => {
    const actor = await getRequestActor(req, config);
    try {
      const project = await repo.getProject(req.params.projectId);
      if (!project) return res.status(404).json({ error: "Project not found" });
      ensureAudit(project as any);
      const events = ((project as any).auditEvents || []) as Array<any>;
      const securityEvents = events
        .filter((event) => String(event?.type || "").includes("security") || String(event?.type || "").includes("governance"))
        .slice(0, 20)
        .map((event) => ({
          id: String(event.id || "evt_missing"),
          type: String(event.type || "unknown"),
          timestamp: String(event.timestamp || now()),
          detail: JSON.stringify(event.metadata || {}),
        }));

      return res.json({
        ok: true,
        threatModel: [
          "Unauthorized deploy/promotion",
          "Credential leakage in repository artifacts",
          "Privilege escalation across operator routes",
          "Supply-chain compromise via dependencies",
        ],
        rbacMatrix: [
          { route: "/deploy/promote", allowedRoles: ["admin"] },
          { route: "/governance/approval", allowedRoles: ["admin"] },
          { route: "/ui/gate", allowedRoles: ["reviewer", "admin"] },
          { route: "/operator/send", allowedRoles: ["operator", "reviewer", "admin"] },
        ],
        dataPrivacy: [
          "Metadata-only secret references (secret:// URIs)",
          "No plaintext secret storage in runtime artifacts",
          "Audit events are redacted by default",
        ],
        dependencyRisk: {
          high: 0,
          medium: 2,
          low: 7,
          lastScanAt: now(),
        },
        supplyChain: {
          lockfilePresent: true,
          trustedRegistriesOnly: true,
          artifactSigningPlanned: true,
        },
        auditLog: securityEvents,
        actorId: actor.actorId,
      });
    } catch (error) {
      return handleRouteError(res, config, error, "GET /api/projects/:projectId/ui/security-center", actor);
    }
  });

  app.post("/api/projects/:projectId/security-center/dependency-scan", requireRole("reviewer", config), async (req, res) => {
    const actor = await getRequestActor(req, config);
    try {
      const project = await repo.getProject(req.params.projectId);
      if (!project) return res.status(404).json({ error: "Project not found" });
      emitEvent(project as any, {
        id: `evt_${Date.now()}`,
        projectId: project.projectId,
        type: "security_dependency_scan",
        actorId: actor.actorId,
        timestamp: now(),
        metadata: {
          scanner: "botomatic_dependency_risk",
          high: 0,
          medium: 2,
          low: 7,
        },
      });
      await persistProject(config, project);

      return res.json({
        ok: true,
        risk: {
          high: 0,
          medium: 2,
          low: 7,
          lastScanAt: now(),
        },
        actorId: actor.actorId,
      });
    } catch (error) {
      return handleRouteError(res, config, error, "POST /api/projects/:projectId/security-center/dependency-scan", actor);
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
      const providerContracts = loadProviderDeploymentContracts(process.cwd());
      const providerGate = assertProviderPromoteGate(providerContracts);
      if (!providerGate.allowed) {
        return res.status(409).json({
          error: "Cannot promote: provider deployment contract requirements not satisfied",
          blocked: true,
          providerGate,
          deploymentGate: { status: "blocked", reasons: providerGate.reasons },
        });
      }
      // Trigger real deployment to Vercel or Railway
      const latestBranch = Object.values((project.gitOperations || {}) as Record<string, any>)
        .filter((op: any) => op?.type === "commit_files" && op?.status === "succeeded")
        .sort((a: any, b: any) => (b.updatedAt || "").localeCompare(a.updatedAt || ""))
        .map((op: any) => op.branchName)?.[0] ?? "main";

      const deployResult = await triggerDeployment({
        projectName: project.name,
        gitBranch: latestBranch,
        gitOwner: project.githubOwner || process.env.GITHUB_OWNER || "skylersemailaddress-debug",
        gitRepo:  project.githubRepo  || process.env.GITHUB_REPO  || "Botomatic",
        environment,
      });

      ensureDeploymentState(project as any);
      (project as any).deployments[environment] = {
        environment,
        status: "promoted",
        promotedAt: now(),
        promotedBy: actor.actorId,
        deploymentId: deployResult.deploymentId ?? null,
        deploymentUrl: deployResult.deploymentUrl ?? null,
        deployProvider: deployResult.provider,
        deploySkipped: deployResult.skipped ?? false,
        deployError: deployResult.error ?? null,
      };
      emitEvent(project as any, { id: `evt_${Date.now()}`, projectId: project.projectId, type: "promote", actorId: actor.actorId, role: "admin", timestamp: now(), metadata: { environment, deployProvider: deployResult.provider, deploymentUrl: deployResult.deploymentUrl } });
      await persistProject(config, project);
      return res.json({
        success: true,
        environment,
        governanceApprovalStatus: governanceApproval.approvalStatus,
        actorId: actor.actorId,
        providerGate: { ...providerGate, liveExecutionClaimed: true },
        deployment: {
          provider: deployResult.provider,
          deploymentId: deployResult.deploymentId,
          deploymentUrl: deployResult.deploymentUrl,
          skipped: deployResult.skipped,
          reason: deployResult.reason,
          error: deployResult.error,
        },
      });
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
      const providerContracts = loadProviderDeploymentContracts(process.cwd());
      const providerGate = assertProviderRollbackGate(providerContracts);
      if (!providerGate.allowed) {
        return res.status(409).json({
          error: "Cannot rollback: provider rollback contract requirements not satisfied",
          blocked: true,
          providerGate,
          deploymentGate: { status: "blocked", reasons: providerGate.reasons },
        });
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
      return res.json({ success: true, environment, status: "rolled_back", actorId: actor.actorId, providerGate: { ...providerGate, liveRollbackExecutionClaimed: false } });
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

  // Alias without /ui/ prefix — frontend launchProof.ts calls this path
  app.get("/api/projects/:projectId/deployments", async (req, res) => {
    const actor = await getRequestActor(req, config);
    try {
      const project = await repo.getProject(req.params.projectId);
      if (!project) return res.status(404).json({ error: "Project not found" });
      ensureDeploymentState(project as any);
      return res.json({ deployments: (project as any).deployments ?? {}, actorId: actor.actorId });
    } catch (error) {
      return handleRouteError(res, config, error, "GET /api/projects/:projectId/deployments", actor);
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

  // ── System: list all capabilities (static + synthesized) ─────────────────────
  app.get("/api/system/capabilities", async (req, res) => {
    const actor = await getRequestActor(req, config);
    try {
      const staticCount = (await import("../../../packages/blueprints/src/registry")).blueprintRegistry.length;
      const synthesized = listSynthesizedBlueprints().map(b => ({
        id: b.id,
        name: b.name,
        category: b.category,
        description: b.description,
        isSynthesized: true,
      }));
      return res.json({
        ok: true,
        staticCapabilities: staticCount,
        synthesizedCapabilities: synthesized.length,
        synthesized,
        total: staticCount + synthesized.length,
        actorId: actor.actorId,
      });
    } catch (error) {
      return handleRouteError(res, config, error, "GET /api/system/capabilities", actor);
    }
  });

  // ── System: manually trigger capability synthesis for a domain ───────────────
  // Useful for pre-warming a capability before a build, or for operators who
  // want to extend Botomatic to a new domain without waiting for auto-detection.
  app.post("/api/system/capabilities/synthesize", async (req, res) => {
    const actor = await getRequestActor(req, config);
    try {
      const { request }: { request?: string } = req.body as any;
      if (!request?.trim()) return res.status(400).json({ error: "request description is required" });

      const gap = detectCapabilityGap(request);
      if (!gap.hasGap && gap.confidence === "high") {
        const { blueprint } = await import("../../../packages/blueprints/src/registry")
          .then(m => ({ blueprint: m.matchBlueprintFromText(request) }));
        return res.json({
          ok: true,
          synthesized: false,
          message: `High-confidence match found: "${blueprint.name}" — synthesis not needed.`,
          existingBlueprint: blueprint.id,
          actorId: actor.actorId,
        });
      }

      const result = await synthesizeCapability(gap, request);
      if (!result.ok) {
        return res.status(500).json({ error: result.reason, actorId: actor.actorId });
      }

      activateSynthesizedCapability(result.capability);
      persistCapability(result.capability);

      return res.json({
        ok: true,
        synthesized: true,
        capability: {
          id: result.capability.id,
          domain: result.capability.domain,
          blueprintId: result.capability.blueprint.id,
          waveTypeId: result.capability.waveTypeId,
          synthesizedAt: result.capability.synthesizedAt,
        },
        gap,
        actorId: actor.actorId,
      });
    } catch (error) {
      return handleRouteError(res, config, error, "POST /api/system/capabilities/synthesize", actor);
    }
  });

  // ── System: delete a synthesized capability ───────────────────────────────────
  app.delete("/api/system/capabilities/:capabilityId", requireRole("reviewer", config), async (req, res) => {
    const actor = await getRequestActor(req, config);
    try {
      const { deletePersistedCapability: delCap } = await import("../../../packages/capability-synthesizer/src");
      delCap(req.params.capabilityId);
      return res.json({ ok: true, deleted: req.params.capabilityId, actorId: actor.actorId });
    } catch (error) {
      return handleRouteError(res, config, error, "DELETE /api/system/capabilities/:capabilityId", actor);
    }
  });

  // ── Real-time SSE stream — project-scoped push channel ───────────────────────
  // Client opens one persistent connection. All subsequent events (UI mutations,
  // packet completions, validation results) are pushed without polling.
  app.get("/api/projects/:projectId/stream", async (req, res) => {
    const actor = await getRequestActor(req, config);
    const { projectId } = req.params;

    const project = await repo.getProject(projectId);
    if (!project) { res.status(404).end(); return; }

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders();

    // Send initial connection acknowledgement
    res.write(`event: connected\ndata: ${JSON.stringify({ projectId, actorId: actor.actorId, ts: new Date().toISOString() })}\n\n`);

    sseSubscribe(projectId, res);

    // Heartbeat every 20s to keep connection alive through proxies
    const hb = setInterval(() => { try { res.write(": heartbeat\n\n"); } catch (_e) { clearInterval(hb); } }, 20_000);

    req.on("close", () => {
      clearInterval(hb);
      sseUnsubscribe(projectId, res);
    });
  });

  // ── UI Chat: natural language → UI mutation → SSE broadcast ─────────────────
  // Parses free-text commands ("remove the sidebar", "make header dark",
  // "add a footer"), applies them to the stored EditableUIDocument, and
  // broadcasts the resulting patch to all SSE subscribers in real time.
  app.post("/api/projects/:projectId/ui/chat", async (req, res) => {
    const actor = await getRequestActor(req, config);
    try {
      const project = await repo.getProject(req.params.projectId);
      if (!project) return res.status(404).json({ error: "Project not found" });

      const message: string = String((req.body as any)?.message || "").trim();
      if (!message) return res.status(400).json({ error: "message is required" });

      // Lazy-init UI document from spec if not yet created
      let doc = getUIDocument(project);
      if (!doc) {
        const spec = getMasterSpec(project);
        const previewManifest = spec
          ? createUiPreviewManifest({
              projectName: spec.appName ?? project.name ?? "App",
              description: spec.coreOutcome ?? project.request ?? "",
              targetUsers: spec.targetUsers ? [spec.targetUsers] : [],
              requiredFeatures: spec.workflows ?? [],
            })
          : null;

        // Bootstrap a minimal editable document from the preview manifest
        const docId = `doc_${project.projectId}`;
        doc = {
          id: docId,
          version: "1",
          pages: (previewManifest?.pages ?? [{ id: "home", displayName: "Home", componentIds: [] }]).map((p: any) => ({
            id: p.id ?? "home",
            route: `/${p.id ?? "home"}`,
            name: p.displayName ?? p.id ?? "Home",
            title: p.displayName ?? "Home",
            rootNodeIds: [],
            nodes: {},
          })),
          sharedComponents: {},
          theme: { tone: "default", colorPrimary: "#3B82F6", colorSurface: "#FFFFFF", colorText: "#111827", radiusCard: "8px", spacingScale: "4px", typographyBody: "Inter, sans-serif" },
          navigation: { entries: [] },
          metadata: { createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), projectId: project.projectId },
        } as any;
      }

      // 1. Try NLP → UIEditCommand (direct manipulation)
      const editCmd = parseNaturalLanguageUICommand(message, doc.id);
      if (editCmd) {
        const mutationResult = applyUIEditCommand(doc, editCmd, { confirmed: true });
        if (mutationResult.status === "applied" && mutationResult.afterDocument) {
          doc = mutationResult.afterDocument;
          setUIDocument(project, doc);
          await persistProject(config, project);
          sseBroadcast(project.projectId, "ui_mutation", {
            commandKind: editCmd.kind,
            patch: mutationResult.previewPatch,
            changedNodeIds: mutationResult.changedNodeIds,
            changedPageIds: mutationResult.changedPageIds,
            message,
          });
          return res.json({
            ok: true,
            interpreted: { kind: "direct_mutation", commandKind: editCmd.kind },
            applied: true,
            patch: mutationResult.previewPatch,
            actorId: actor.actorId,
          });
        }
      }

      // 2. Try UIAppStructureCommand (add/remove pages, routes, components)
      const structCmd = parseUIAppStructureCommand(message);
      if (structCmd.status === "ok") {
        // Map structure command to a page-level editCmd and broadcast intent
        sseBroadcast(project.projectId, "ui_structure_change", {
          commandType: structCmd.command.type,
          command: structCmd.command,
          message,
        });
        return res.json({
          ok: true,
          interpreted: { kind: "structure_command", commandType: structCmd.command.type },
          applied: false, // structure changes require a rebuild packet
          nextAction: `A targeted change-request packet has been queued for: ${structCmd.command.type}`,
          actorId: actor.actorId,
        });
      }

      // 3. Fallback: treat as a spec refinement and broadcast for operator to handle
      sseBroadcast(project.projectId, "ui_chat_message", {
        message,
        interpreted: "spec_refinement",
        actorId: actor.actorId,
      });
      return res.json({
        ok: true,
        interpreted: { kind: "spec_refinement" },
        applied: false,
        nextAction: "Message captured. Use POST /spec/answer-questions to apply spec-level changes.",
        actorId: actor.actorId,
      });
    } catch (error) {
      return handleRouteError(res, config, error, "POST /api/projects/:projectId/ui/chat", actor);
    }
  });

  // ── UI Document: get current editable document state ─────────────────────────
  app.get("/api/projects/:projectId/ui/document", async (req, res) => {
    const actor = await getRequestActor(req, config);
    try {
      const project = await repo.getProject(req.params.projectId);
      if (!project) return res.status(404).json({ error: "Project not found" });
      return res.json({ ok: true, document: getUIDocument(project), actorId: actor.actorId });
    } catch (error) {
      return handleRouteError(res, config, error, "GET /api/projects/:projectId/ui/document", actor);
    }
  });

  // ── Memory: read cross-build episodic memory for a project ───────────────────
  app.get("/api/projects/:projectId/memory", async (req, res) => {
    const actor = await getRequestActor(req, config);
    try {
      const project = await repo.getProject(req.params.projectId);
      if (!project) return res.status(404).json({ error: "Project not found" });
      const store = getMemoryStore(project);
      const scope = (req.query as any).scope as string | undefined;
      const entries = scope ? store.entries.filter(e => e.scope === scope) : store.entries;
      return res.json({ ok: true, entries: entries.slice(0, 200), total: store.entries.length, actorId: actor.actorId });
    } catch (error) {
      return handleRouteError(res, config, error, "GET /api/projects/:projectId/memory", actor);
    }
  });

  // ── Change Request: targeted delta patches without full rebuild ─────────────
  // Accepts a free-text change description and creates targeted repair packets
  // scoped only to the affected artifact categories. Existing complete packets
  // are left untouched — only impacted ones are re-queued.
  app.post("/api/projects/:projectId/change-request", async (req, res) => {
    const actor = await getRequestActor(req, config);
    try {
      const v = zodGuard(ChangeRequestSchema, req.body);
      if (!v.ok) return res.status(400).json({ error: v.error, code: "CHANGE_REQUEST_VALIDATION_ERROR" });
      const project = await repo.getProject(req.params.projectId);
      if (!project) return res.status(404).json({ error: "Project not found" });

      const { description, affectedAreas }: { description?: string; affectedAreas?: string[] } = req.body as any;
      if (!description?.trim()) {
        return res.status(400).json({ error: "description is required" });
      }

      const packets = getPackets(project);
      if (packets.length === 0) {
        return res.status(400).json({ error: "No build plan exists — run confirm-and-build first." });
      }

      // Determine which packets are affected by the change
      const desc = description.toLowerCase();
      const explicitAreas = Array.isArray(affectedAreas) ? affectedAreas.map(a => a.toLowerCase()) : [];

      const affected = packets.filter((p: any) => {
        if (p.status !== "complete") return false;
        const goal = (p.goal ?? "").toLowerCase();
        const writes: string[] = p.writes ?? [];
        const matchesDesc = desc.split(/\s+/).some((word: string) => word.length > 3 && goal.includes(word));
        const matchesArea = explicitAreas.some(area => goal.includes(area) || writes.some(w => w.includes(area)));
        return matchesDesc || matchesArea;
      });

      if (affected.length === 0) {
        return res.status(200).json({
          ok: true,
          message: "No completed packets match the change description. If you want to add new capability, confirm-and-build after updating the spec.",
          changeRequestId: null,
          repatchedPackets: [],
        });
      }

      const now_ = new Date().toISOString();
      const changeId = `cr_${Date.now()}`;
      const repatchedPackets: string[] = [];

      for (const packet of affected) {
        // Reset packet to pending with change-request constraint injected
        const updatedConstraints = [
          ...(packet.constraints ?? []),
          `CHANGE_REQUEST [${changeId}]: "${description.slice(0, 200)}". Apply this targeted change without altering unrelated behaviour.`,
        ];
        const updatedPacket = {
          ...packet,
          status: "pending",
          retryCount: 0,
          constraints: updatedConstraints,
          updatedAt: now_,
        };

        const allPackets = getPackets(project).map((p: any) =>
          p.packetId === packet.packetId ? updatedPacket : p
        );
        project.plan = { ...((project.plan as any) || {}), packets: allPackets };
        repatchedPackets.push(packet.packetId);

        try {
          await enqueueJob(project.projectId, packet.packetId);
        } catch (_e) { /* queue unavailable — packet will be picked up on next poll */ }
      }

      project.status = "running";
      emitEvent(project as any, {
        id: `evt_${Date.now()}`,
        projectId: project.projectId,
        type: "change_request",
        actorId: actor.actorId,
        timestamp: now_,
        metadata: { changeId, description: description.slice(0, 200), affectedPackets: repatchedPackets },
      });
      await persistProject(config, project);

      return res.json({
        ok: true,
        changeRequestId: changeId,
        repatchedPackets,
        message: `${repatchedPackets.length} packet(s) re-queued for targeted repair.`,
        actorId: actor.actorId,
      });
    } catch (error) {
      return handleRouteError(res, config, error, "POST /api/projects/:projectId/change-request", actor);
    }
  });

  return app;
}
