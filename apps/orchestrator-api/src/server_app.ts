import express from "express";
import { compileConversationToMasterTruth } from "../../../packages/master-truth/src/compiler";
import { generatePlan } from "../../../packages/packet-engine/src/generator";
import { markPacketComplete, markPacketFailed } from "../../../packages/execution/src/runner";
import { MockExecutor } from "../../../packages/executor-adapters/src/mockExecutor";
import { ClaudeCodeExecutor } from "../../../packages/executor-adapters/src/claudeCodeExecutor";
import { runValidation } from "../../../packages/validation/src/runner";
import { createGitOperation, GitOperationRequest, GitOperationResult } from "../../../packages/github-adapter/src/operations";
import { GitHubRuntime } from "../../../packages/github-adapter/src/githubRuntime";
import { StoredProjectRecord } from "../../../packages/supabase-adapter/src/types";
import { RuntimeConfig } from "./config";

function now(): string {
  return new Date().toISOString();
}

type RequestActor = {
  actorId: string;
  actorSource: "x-actor-id" | "x-user-email" | "bearer_token" | "anonymous";
};

type QueueJobStatus = "queued" | "running" | "succeeded" | "failed";

type QueueJobRecord = {
  jobId: string;
  type: "execute_packet";
  projectId: string;
  packetId: string;
  status: QueueJobStatus;
  actorId: string;
  actorSource: RequestActor["actorSource"];
  attempts: number;
  lastError?: string;
  createdAt: string;
  updatedAt: string;
  workerId?: string;
  leaseExpiresAt?: string;
};

type ProjectSummaryRow = {
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

const workerId = process.env.WORKER_ID || `worker_${Math.random().toString(36).slice(2, 8)}`;
const leaseMs = Number(process.env.QUEUE_LEASE_MS || 30000);
let workerStarted = false;
let workerBusy = false;

function toStored(record: {
  projectId: string;
  name: string;
  request: string;
  status: string;
  masterTruth?: any;
  plan?: any;
  runs?: any;
  validations?: any;
  gitOperations?: Record<string, any>;
  gitResults?: Record<string, any>;
}): StoredProjectRecord {
  const timestamp = now();
  return {
    projectId: record.projectId,
    name: record.name,
    request: record.request,
    status: record.status,
    masterTruth: record.masterTruth ?? null,
    plan: record.plan ?? null,
    runs: record.runs ?? null,
    validations: record.validations ?? null,
    gitOperations: record.gitOperations ?? null,
    gitResults: record.gitResults ?? null,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

function fromProjectRow(row: ProjectSummaryRow): StoredProjectRecord {
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

function joinRestUrl(baseUrl: string, path: string): string {
  return `${String(baseUrl).replace(/\/$/, "")}/rest/v1/${path}`;
}

async function listDurableProjects(config: RuntimeConfig): Promise<StoredProjectRecord[]> {
  if (config.repository.mode !== "durable") {
    return [];
  }

  const url = joinRestUrl(
    String(process.env.SUPABASE_URL),
    "orchestrator_projects?select=*"
  );
  const res = await fetch(url, {
    method: "GET",
    headers: {
      apikey: String(process.env.SUPABASE_SERVICE_ROLE_KEY),
      Authorization: `Bearer ${String(process.env.SUPABASE_SERVICE_ROLE_KEY)}`,
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    const body = await parseJsonSafe(res);
    throw new Error(`Failed to list durable projects ${res.status}: ${JSON.stringify(body)}`);
  }

  const rows = (await parseJsonSafe(res)) as ProjectSummaryRow[] | null;
  return (rows || []).map(fromProjectRow);
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

function getRequestActor(req: express.Request, config: RuntimeConfig): RequestActor {
  const actorIdHeader = req.header("x-actor-id");
  if (actorIdHeader) {
    return { actorId: actorIdHeader, actorSource: "x-actor-id" };
  }
  const userEmailHeader = req.header("x-user-email");
  if (userEmailHeader) {
    return { actorId: userEmailHeader, actorSource: "x-user-email" };
  }
  if (config.auth.enabled && config.auth.token) {
    return {
      actorId: `api_token:${String(config.auth.token).slice(0, 6)}`,
      actorSource: "bearer_token",
    };
  }
  return { actorId: "anonymous", actorSource: "anonymous" };
}

function requireApiAuth(config: RuntimeConfig): express.RequestHandler {
  return (req, res, next) => {
    if (!config.auth.enabled || !config.auth.token) {
      return res.status(500).json({
        error: "API auth is not configured",
        authEnabled: config.auth.enabled,
        authImplementation: config.auth.implementation,
      });
    }
    const authorization = req.header("authorization") || "";
    const expected = `Bearer ${config.auth.token}`;
    if (authorization !== expected) {
      return res.status(401).json({
        error: "Unauthorized",
        authEnabled: config.auth.enabled,
        authImplementation: config.auth.implementation,
      });
    }
    return next();
  };
}

function handleRouteError(res: express.Response, config: RuntimeConfig, error: unknown, route: string, actor?: RequestActor) {
  const message = String((error as any)?.message || error);
  console.error(
    JSON.stringify({
      event: "route_error",
      route,
      repositoryMode: config.repository.mode,
      repositoryImplementation: config.repository.implementation,
      authEnabled: config.auth.enabled,
      authImplementation: config.auth.implementation,
      actorId: actor?.actorId || "unknown",
      actorSource: actor?.actorSource || "unknown",
      message,
      workerId,
      timestamp: now(),
    })
  );

  return res.status(500).json({
    error: message,
    repositoryMode: config.repository.mode,
    repositoryImplementation: config.repository.implementation,
    authEnabled: config.auth.enabled,
    authImplementation: config.auth.implementation,
    workerId,
  });
}

function getJobs(project: StoredProjectRecord): Record<string, QueueJobRecord> {
  const runs = (project.runs || {}) as Record<string, unknown>;
  return ((runs.__jobs || {}) as Record<string, QueueJobRecord>) || {};
}

function setJobs(project: StoredProjectRecord, jobs: Record<string, QueueJobRecord>) {
  project.runs = {
    ...((project.runs || {}) as Record<string, unknown>),
    __jobs: jobs,
  };
}

function upsertJob(project: StoredProjectRecord, job: QueueJobRecord) {
  const jobs = getJobs(project);
  jobs[job.jobId] = job;
  setJobs(project, jobs);
}

function setPacketStatus(project: StoredProjectRecord, packetId: string, status: string) {
  const plan = (project.plan || {}) as any;
  const packets = Array.isArray(plan.packets) ? plan.packets : [];
  project.plan = {
    ...plan,
    packets: packets.map((packet: any) => packet.packetId === packetId ? { ...packet, status, updatedAt: now() } : packet),
  };
}

function getPacket(project: StoredProjectRecord, packetId: string) {
  const plan = (project.plan || {}) as any;
  const packets = Array.isArray(plan.packets) ? plan.packets : [];
  return packets.find((packet: any) => packet.packetId === packetId) || null;
}

function getNextPendingPacket(project: StoredProjectRecord) {
  const plan = (project.plan || {}) as any;
  const packets = Array.isArray(plan.packets) ? plan.packets : [];
  return packets.find((packet: any) => packet.status === "pending") || null;
}

function ensureGitOperation(project: StoredProjectRecord, input: {
  packetId: string;
  type: "create_branch" | "commit_files" | "open_pull_request";
  branchName?: string;
  title?: string;
  body?: string;
}): GitOperationRequest {
  const operationId = `${input.packetId}:${input.type}`;
  const existing = ((project.gitOperations || {}) as Record<string, GitOperationRequest>)[operationId];
  if (existing) return existing;
  const created = createGitOperation({
    operationId,
    projectId: project.projectId,
    packetId: input.packetId,
    type: input.type,
    branchName: input.branchName,
    title: input.title,
    body: input.body,
  });
  project.gitOperations = {
    ...((project.gitOperations || {}) as Record<string, GitOperationRequest>),
    [operationId]: created,
  };
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
  project.gitResults = {
    ...((project.gitResults || {}) as Record<string, GitOperationResult>),
    [result.operationId]: result,
  };
}

function getGitOperationResult(project: StoredProjectRecord, operationId: string) {
  return ((project.gitResults || {}) as Record<string, GitOperationResult>)[operationId] || null;
}

function getLeaseExpiry(): string {
  return new Date(Date.now() + leaseMs).toISOString();
}

function isLeaseExpired(job: QueueJobRecord): boolean {
  return !job.leaseExpiresAt || new Date(job.leaseExpiresAt).getTime() <= Date.now();
}

async function persistProject(config: RuntimeConfig, project: StoredProjectRecord) {
  project.updatedAt = now();
  await config.repository.repo.upsertProject(project);
}

async function runGitHubLifecycle(config: RuntimeConfig, project: StoredProjectRecord, packet: any, changedFiles: { path: string; body: string }[]) {
  const gh = getGitHub();

  const branchOp = ensureGitOperation(project, { packetId: packet.packetId, type: "create_branch", branchName: packet.branchName });
  if (!getGitOperationResult(project, branchOp.operationId)?.status || getGitOperationResult(project, branchOp.operationId)?.status === "failed") {
    setGitOperationStatus(project, branchOp.operationId, "submitted");
    await persistProject(config, project);
    try {
      const baseSha = await gh.getDefaultBranchSha();
      await gh.createBranch(packet.branchName, baseSha);
      setGitOperationStatus(project, branchOp.operationId, "succeeded");
      setGitOperationResult(project, { operationId: branchOp.operationId, status: "succeeded", branchName: packet.branchName, updatedAt: now() });
    } catch (error: any) {
      const message = String(error?.message || error);
      if (message.includes("Reference already exists")) {
        setGitOperationStatus(project, branchOp.operationId, "succeeded");
        setGitOperationResult(project, { operationId: branchOp.operationId, status: "succeeded", branchName: packet.branchName, updatedAt: now() });
      } else {
        setGitOperationStatus(project, branchOp.operationId, "failed");
        setGitOperationResult(project, { operationId: branchOp.operationId, status: "failed", branchName: packet.branchName, error: message, updatedAt: now() });
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
      const commit = await gh.commitFiles(packet.branchName, `Packet ${packet.packetId}`, changedFiles.map((file) => ({ path: file.path, content: file.body })));
      setGitOperationStatus(project, commitOp.operationId, "succeeded");
      setGitOperationResult(project, { operationId: commitOp.operationId, status: "succeeded", branchName: packet.branchName, commitSha: commit.sha, updatedAt: now() });
    } catch (error: any) {
      setGitOperationStatus(project, commitOp.operationId, "failed");
      setGitOperationResult(project, { operationId: commitOp.operationId, status: "failed", branchName: packet.branchName, error: String(error?.message || error), updatedAt: now() });
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
      setGitOperationResult(project, { operationId: prOp.operationId, status: "succeeded", branchName: packet.branchName, prUrl: pr.html_url, updatedAt: now() });
    } catch (error: any) {
      setGitOperationStatus(project, prOp.operationId, "failed");
      setGitOperationResult(project, { operationId: prOp.operationId, status: "failed", branchName: packet.branchName, error: String(error?.message || error), updatedAt: now() });
      await persistProject(config, project);
      throw error;
    }
    await persistProject(config, project);
  }
}

async function claimAvailableJob(config: RuntimeConfig): Promise<{ project: StoredProjectRecord; job: QueueJobRecord } | null> {
  const projects = config.repository.mode === "durable"
    ? await listDurableProjects(config)
    : [];

  for (const project of projects) {
    const jobs = Object.values(getJobs(project));
    const candidate = jobs.find((job) => (job.status === "queued") || (job.status === "running" && isLeaseExpired(job)) || (job.status === "failed" && job.attempts < 3));
    if (!candidate) continue;

    const claimed: QueueJobRecord = {
      ...candidate,
      status: "running",
      workerId,
      attempts: candidate.status === "running" ? candidate.attempts : candidate.attempts + 1,
      leaseExpiresAt: getLeaseExpiry(),
      updatedAt: now(),
    };
    upsertJob(project, claimed);
    await persistProject(config, project);
    return { project, job: claimed };
  }

  return null;
}

function finalizeJob(project: StoredProjectRecord, job: QueueJobRecord, status: QueueJobStatus, lastError?: string) {
  upsertJob(project, {
    ...job,
    status,
    lastError,
    workerId,
    leaseExpiresAt: undefined,
    updatedAt: now(),
  });
}

async function processJob(config: RuntimeConfig, project: StoredProjectRecord, job: QueueJobRecord) {
  const packet = getPacket(project, job.packetId);
  if (!packet) {
    finalizeJob(project, job, "failed", `Packet not found: ${job.packetId}`);
    await persistProject(config, project);
    return;
  }

  setPacketStatus(project, packet.packetId, "executing");
  project.status = "executing";
  await persistProject(config, project);

  try {
    const executor = getExecutor();
    const result = await executor.execute({
      projectId: project.projectId,
      packetId: packet.packetId,
      branchName: packet.branchName,
      goal: packet.goal,
      requirements: packet.requirements,
      constraints: packet.constraints,
    });

    if (!result.success) {
      const failedState = markPacketFailed({ projectId: project.projectId, status: project.status as any, packets: ((project.plan as any)?.packets || []), runs: project.runs as any }, packet.packetId);
      project.plan = { ...((project.plan as any) || {}), packets: failedState.packets };
      project.status = failedState.status;
      project.runs = failedState.runs || project.runs;
      finalizeJob(project, job, "failed", result.summary);
      await persistProject(config, project);
      return;
    }

    await runGitHubLifecycle(config, project, packet, result.changedFiles as any);

    const validation = runValidation(project.projectId, packet.packetId);
    project.validations = { ...((project.validations || {}) as Record<string, unknown>), [packet.packetId]: validation };

    const completedState = markPacketComplete({ projectId: project.projectId, status: project.status as any, packets: ((project.plan as any)?.packets || []), runs: project.runs as any }, packet.packetId);
    project.plan = { ...((project.plan as any) || {}), packets: completedState.packets };
    project.status = completedState.status;
    project.runs = completedState.runs || project.runs;
    finalizeJob(project, job, "succeeded");
    await persistProject(config, project);
  } catch (error: any) {
    const failedState = markPacketFailed({ projectId: project.projectId, status: project.status as any, packets: ((project.plan as any)?.packets || []), runs: project.runs as any }, packet.packetId);
    project.plan = { ...((project.plan as any) || {}), packets: failedState.packets };
    project.status = failedState.status;
    project.runs = failedState.runs || project.runs;
    finalizeJob(project, job, "failed", String(error?.message || error));
    await persistProject(config, project);
  }
}

function startQueueWorker(config: RuntimeConfig) {
  if (workerStarted) return;
  workerStarted = true;

  setInterval(async () => {
    if (workerBusy) return;
    workerBusy = true;
    try {
      const claim = await claimAvailableJob(config);
      if (claim) {
        await processJob(config, claim.project, claim.job);
      }
    } catch (error: any) {
      console.error(JSON.stringify({ event: "queue_worker_error", workerId, message: String(error?.message || error), timestamp: now() }));
    } finally {
      workerBusy = false;
    }
  }, Number(process.env.QUEUE_POLL_INTERVAL_MS || 2000));
}

function getQueueStatsFromProject(project: StoredProjectRecord) {
  const jobs = Object.values(getJobs(project));
  return {
    queued: jobs.filter((job) => job.status === "queued").length,
    running: jobs.filter((job) => job.status === "running").length,
    failed: jobs.filter((job) => job.status === "failed").length,
  };
}

export function buildApp(config: RuntimeConfig) {
  const app = express();
  const repo = config.repository.repo;

  startQueueWorker(config);
  app.use(express.json());

  app.get("/api/health", async (req, res) => {
    let queueDepth = 0;
    if (config.repository.mode === "durable") {
      try {
        const projects = await listDurableProjects(config);
        queueDepth = projects.reduce((sum, project) => sum + getQueueStatsFromProject(project).queued + getQueueStatsFromProject(project).running, 0);
      } catch {
        queueDepth = -1;
      }
    }
    res.json({
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
      queueEnabled: true,
      queueDepth,
      workerBusy,
      workerId,
      leaseMs,
    });
  });

  app.use("/api/projects", requireApiAuth(config));

  app.post("/api/projects/intake", async (req, res) => {
    const actor = getRequestActor(req, config);
    try {
      const { name, request } = req.body;
      const projectId = `proj_${Date.now()}`;
      const project = toStored({ projectId, name, request, status: "clarifying" });
      await repo.upsertProject(project);
      return res.json({ projectId, status: project.status, actorId: actor.actorId });
    } catch (error) {
      return handleRouteError(res, config, error, "POST /api/projects/intake", actor);
    }
  });

  app.post("/api/projects/:projectId/compile", async (req, res) => {
    const actor = getRequestActor(req, config);
    try {
      const project = await repo.getProject(req.params.projectId);
      if (!project) return res.status(404).json({ error: "Project not found" });
      const truth = compileConversationToMasterTruth({ projectId: project.projectId, appName: project.name, request: project.request });
      const updated: StoredProjectRecord = { ...project, masterTruth: truth, status: truth.status, updatedAt: now() };
      await repo.upsertProject(updated);
      return res.json({ projectId: updated.projectId, status: updated.status, actorId: actor.actorId });
    } catch (error) {
      return handleRouteError(res, config, error, "POST /api/projects/:projectId/compile", actor);
    }
  });

  app.post("/api/projects/:projectId/plan", async (req, res) => {
    const actor = getRequestActor(req, config);
    try {
      const project = await repo.getProject(req.params.projectId);
      if (!project || !project.masterTruth) return res.status(404).json({ error: "No master truth" });
      const plan = generatePlan(project.masterTruth as any);
      const updated: StoredProjectRecord = { ...project, plan, status: "queued", updatedAt: now() };
      await repo.upsertProject(updated);
      return res.json({ projectId: updated.projectId, status: updated.status, actorId: actor.actorId });
    } catch (error) {
      return handleRouteError(res, config, error, "POST /api/projects/:projectId/plan", actor);
    }
  });

  app.post("/api/projects/:projectId/git/result", async (req, res) => {
    const actor = getRequestActor(req, config);
    try {
      const project = await repo.getProject(req.params.projectId);
      if (!project) return res.status(404).json({ error: "Project not found" });
      const result = req.body;
      const updated: StoredProjectRecord = {
        ...project,
        gitResults: { ...(project.gitResults || {}), [result.operationId || `result_${Date.now()}`]: result },
        updatedAt: now(),
      };
      await repo.upsertProject(updated);
      return res.json({ status: "recorded", actorId: actor.actorId });
    } catch (error) {
      return handleRouteError(res, config, error, "POST /api/projects/:projectId/git/result", actor);
    }
  });

  app.post("/api/projects/:projectId/dispatch/execute-next", async (req, res) => {
    const actor = getRequestActor(req, config);
    try {
      const project = await repo.getProject(req.params.projectId);
      if (!project || !project.plan) return res.status(404).json({ error: "No plan" });
      const packet = getNextPendingPacket(project);
      if (!packet) {
        return res.status(409).json({ error: "No pending packet", actorId: actor.actorId });
      }

      const existingJob = Object.values(getJobs(project)).find((job) => job.packetId === packet.packetId && (job.status === "queued" || job.status === "running") && !isLeaseExpired(job));
      if (existingJob) {
        return res.status(202).json({ accepted: true, queued: true, jobId: existingJob.jobId, packetId: packet.packetId, actorId: actor.actorId, workerId: existingJob.workerId || null });
      }

      const job: QueueJobRecord = {
        jobId: `job_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        type: "execute_packet",
        projectId: project.projectId,
        packetId: packet.packetId,
        status: "queued",
        actorId: actor.actorId,
        actorSource: actor.actorSource,
        attempts: 0,
        createdAt: now(),
        updatedAt: now(),
      };
      upsertJob(project, job);
      await persistProject(config, project);
      return res.status(202).json({ accepted: true, queued: true, jobId: job.jobId, packetId: packet.packetId, actorId: actor.actorId, workerId });
    } catch (error) {
      return handleRouteError(res, config, error, "POST /api/projects/:projectId/dispatch/execute-next", actor);
    }
  });

  app.get("/api/projects/:projectId/status", async (req, res) => {
    const actor = getRequestActor(req, config);
    try {
      const project = await repo.getProject(req.params.projectId);
      if (!project) return res.status(404).json({ error: "Project not found" });
      return res.json({ ...project, actorId: actor.actorId, workerId });
    } catch (error) {
      return handleRouteError(res, config, error, "GET /api/projects/:projectId/status", actor);
    }
  });

  return app;
}
