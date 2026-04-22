import express from "express";
import { compileConversationToMasterTruth } from "../../../packages/master-truth/src/compiler";
import { generatePlan } from "../../../packages/packet-engine/src/generator";
import { advanceProject, markPacketComplete, markPacketFailed } from "../../../packages/execution/src/runner";
import { MockExecutor } from "../../../packages/executor-adapters/src/mockExecutor";
import { ClaudeCodeExecutor } from "../../../packages/executor-adapters/src/claudeCodeExecutor";
import { runValidation } from "../../../packages/validation/src/runner";
import { createGitOperation } from "../../../packages/github-adapter/src/operations";
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
      timestamp: now(),
    })
  );

  return res.status(500).json({
    error: message,
    repositoryMode: config.repository.mode,
    repositoryImplementation: config.repository.implementation,
    authEnabled: config.auth.enabled,
    authImplementation: config.auth.implementation,
  });
}

export function buildApp(config: RuntimeConfig) {
  const app = express();
  const repo = config.repository.repo;

  app.use(express.json());

  app.get("/api/health", (req, res) => {
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

      let updatedState = advanceProject({
        projectId: project.projectId,
        status: project.status as any,
        packets: (project.plan as any).packets,
        runs: project.runs as any,
      });

      let updated: StoredProjectRecord = {
        ...project,
        status: updatedState.status,
        plan: { ...(project.plan as any), packets: updatedState.packets },
        runs: updatedState.runs,
        updatedAt: now(),
      };

      const executingPacket = (updated.plan as any).packets.find((p: any) => p.status === "executing");
      if (executingPacket) {
        const op = createGitOperation({ projectId: updated.projectId, packetId: executingPacket.packetId, type: "create_branch", branchName: executingPacket.branchName });
        updated.gitOperations = { ...(updated.gitOperations || {}), [op.operationId]: op };

        try {
          const executor = getExecutor();
          const result = await executor.execute({
            projectId: updated.projectId,
            packetId: executingPacket.packetId,
            branchName: executingPacket.branchName,
            goal: executingPacket.goal,
            requirements: executingPacket.requirements,
            constraints: executingPacket.constraints,
          });

          if (result.success) {
            const gh = getGitHub();
            const baseSha = await gh.getDefaultBranchSha();
            await gh.createBranch(executingPacket.branchName, baseSha);
            await gh.commitFiles(executingPacket.branchName, `Packet ${executingPacket.packetId}`, result.changedFiles.map((f: any) => ({ path: f.path, content: f.body })));
            const pr = await gh.createPullRequest(`Packet ${executingPacket.packetId}`, executingPacket.branchName);
            updated.gitResults = { ...(updated.gitResults || {}), [op.operationId]: pr };
            const validation = runValidation(updated.projectId, executingPacket.packetId);
            updated.validations = { ...(updated.validations || {}), [executingPacket.packetId]: validation };
            updatedState = markPacketComplete(updatedState, executingPacket.packetId);
          } else {
            updatedState = markPacketFailed(updatedState, executingPacket.packetId);
          }
        } catch (error: any) {
          updatedState = markPacketFailed(updatedState, executingPacket.packetId);
          updated.runs = {
            ...(updated.runs || {}),
            [executingPacket.packetId]: {
              ...(updated.runs?.[executingPacket.packetId] || {}),
              logs: [
                ...(updated.runs?.[executingPacket.packetId]?.logs || []),
                { timestamp: now(), level: "error", event: "executor_or_github_failed", message: String(error?.message || error) },
              ],
            },
          };
        }

        updated = {
          ...updated,
          status: updatedState.status,
          plan: { ...(updated.plan as any), packets: updatedState.packets },
          runs: updatedState.runs || updated.runs,
          updatedAt: now(),
        };
      }

      await repo.upsertProject(updated);
      return res.json({ projectId: updated.projectId, status: updated.status, gitOperations: updated.gitOperations, gitResults: updated.gitResults, actorId: actor.actorId });
    } catch (error) {
      return handleRouteError(res, config, error, "POST /api/projects/:projectId/dispatch/execute-next", actor);
    }
  });

  app.get("/api/projects/:projectId/status", async (req, res) => {
    const actor = getRequestActor(req, config);
    try {
      const project = await repo.getProject(req.params.projectId);
      if (!project) return res.status(404).json({ error: "Project not found" });
      return res.json({ ...project, actorId: actor.actorId });
    } catch (error) {
      return handleRouteError(res, config, error, "GET /api/projects/:projectId/status", actor);
    }
  });

  return app;
}
