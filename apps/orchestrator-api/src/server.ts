import express from "express";
import { compileConversationToMasterTruth } from "../../../packages/master-truth/src/compiler";
import { generatePlan } from "../../../packages/packet-engine/src/generator";
import { advanceProject, markPacketComplete, markPacketFailed } from "../../../packages/execution/src/runner";
import { MockExecutor } from "../../../packages/executor-adapters/src/mockExecutor";
import { ClaudeCodeExecutor } from "../../../packages/executor-adapters/src/claudeCodeExecutor";
import { runValidation } from "../../../packages/validation/src/runner";
import { createGitOperation } from "../../../packages/github-adapter/src/operations";
import { GitHubRuntime } from "../../../packages/github-adapter/src/githubRuntime";
import { InMemoryProjectRepository } from "../../../packages/supabase-adapter/src/memoryRepo";
import { StoredProjectRecord } from "../../../packages/supabase-adapter/src/types";

const app = express();
app.use(express.json());

const repo = new InMemoryProjectRepository();

function now(): string {
  return new Date().toISOString();
}

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

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

app.post("/api/projects/intake", async (req, res) => {
  const { name, request } = req.body;
  const projectId = `proj_${Date.now()}`;

  const project = toStored({
    projectId,
    name,
    request,
    status: "clarifying",
  });

  await repo.upsertProject(project);
  return res.json({ projectId, status: project.status });
});

app.post("/api/projects/:projectId/compile", async (req, res) => {
  const project = await repo.getProject(req.params.projectId);
  if (!project) return res.status(404).json({ error: "Project not found" });

  const truth = compileConversationToMasterTruth({
    projectId: project.projectId,
    appName: project.name,
    request: project.request,
  });

  const updated: StoredProjectRecord = {
    ...project,
    masterTruth: truth,
    status: truth.status,
    updatedAt: now(),
  };

  await repo.upsertProject(updated);
  return res.json({ projectId: updated.projectId, status: updated.status });
});

app.post("/api/projects/:projectId/plan", async (req, res) => {
  const project = await repo.getProject(req.params.projectId);
  if (!project || !project.masterTruth) return res.status(404).json({ error: "No master truth" });

  const plan = generatePlan(project.masterTruth as any);
  const updated: StoredProjectRecord = {
    ...project,
    plan,
    status: "queued",
    updatedAt: now(),
  };

  await repo.upsertProject(updated);
  return res.json({ projectId: updated.projectId, status: updated.status });
});

app.post("/api/projects/:projectId/git/result", async (req, res) => {
  const project = await repo.getProject(req.params.projectId);
  if (!project) return res.status(404).json({ error: "Project not found" });

  const result = req.body;
  const updated: StoredProjectRecord = {
    ...project,
    gitResults: {
      ...(project.gitResults || {}),
      [result.operationId || `result_${Date.now()}`]: result,
    },
    updatedAt: now(),
  };

  await repo.upsertProject(updated);
  return res.json({ status: "recorded" });
});

app.post("/api/projects/:projectId/dispatch/execute-next", async (req, res) => {
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
    const op = createGitOperation({
      projectId: updated.projectId,
      packetId: executingPacket.packetId,
      type: "create_branch",
      branchName: executingPacket.branchName,
    });

    updated.gitOperations = {
      ...(updated.gitOperations || {}),
      [op.operationId]: op,
    };

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

        await gh.commitFiles(
          executingPacket.branchName,
          `Packet ${executingPacket.packetId}`,
          result.changedFiles.map((f: any) => ({
            path: f.path,
            content: f.body,
          }))
        );

        const pr = await gh.createPullRequest(
          `Packet ${executingPacket.packetId}`,
          executingPacket.branchName
        );

        updated.gitResults = {
          ...(updated.gitResults || {}),
          [op.operationId]: pr,
        };

        const validation = runValidation(updated.projectId, executingPacket.packetId);
        updated.validations = {
          ...(updated.validations || {}),
          [executingPacket.packetId]: validation,
        };

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
            {
              timestamp: now(),
              level: "error",
              event: "executor_or_github_failed",
              message: String(error?.message || error),
            },
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

  return res.json({
    projectId: updated.projectId,
    status: updated.status,
    gitOperations: updated.gitOperations,
    gitResults: updated.gitResults,
  });
});

app.get("/api/projects/:projectId/status", async (req, res) => {
  const project = await repo.getProject(req.params.projectId);
  if (!project) return res.status(404).json({ error: "Project not found" });
  return res.json(project);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`API running on ${PORT}`));
