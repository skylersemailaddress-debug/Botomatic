import express from "express";
import { compileConversationToMasterTruth } from "../../../packages/master-truth/src/compiler";
import { generatePlan } from "../../../packages/packet-engine/src/generator";
import { advanceProject, markPacketComplete, markPacketFailed } from "../../../packages/execution/src/runner";
import { MockExecutor } from "../../../packages/executor-adapters/src/mockExecutor";
import { ClaudeExecutorStub } from "../../../packages/executor-adapters/src/claudeExecutorStub";
import { runValidation } from "../../../packages/validation/src/runner";
import { createGitOperation } from "../../../packages/github-adapter/src/operations";
import { InMemoryProjectRepository } from "../../../packages/supabase-adapter/src/memoryRepo";
import { StoredProjectRecord } from "../../../packages/supabase-adapter/src/types";
import { createTriggerJob } from "../../../packages/trigger-adapter/src/jobs";
import { InMemoryJobRepository } from "../../../packages/trigger-adapter/src/jobRepo";
import { getRetryDecision } from "../../../packages/trigger-adapter/src/retryPolicy";

const app = express();
app.use(express.json());

const repo = new InMemoryProjectRepository();
const jobRepo = new InMemoryJobRepository();

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
  triggerJobs?: Record<string, any>;
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
    updatedAt: timestamp
  };
}

app.post("/api/projects/intake", async (req, res) => {
  const { name, request } = req.body;
  const projectId = `proj_${Date.now()}`;

  const project = toStored({
    projectId,
    name,
    request,
    status: "clarifying"
  });

  await repo.upsertProject(project);
  res.json({ projectId, status: project.status });
});

app.post("/api/projects/:projectId/compile", async (req, res) => {
  const project = await repo.getProject(req.params.projectId);
  if (!project) return res.status(404).json({ error: "Project not found" });

  const truth = compileConversationToMasterTruth({
    projectId: project.projectId,
    appName: project.name,
    request: project.request
  });

  const updated: StoredProjectRecord = {
    ...project,
    masterTruth: truth,
    status: truth.status,
    updatedAt: now()
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
    updatedAt: now()
  };

  await repo.upsertProject(updated);
  return res.json({ projectId: updated.projectId, status: updated.status });
});

app.post("/api/projects/:projectId/git/request", async (req, res) => {
  const project = await repo.getProject(req.params.projectId);
  if (!project) return res.status(404).json({ error: "Project not found" });

  const operation = createGitOperation(req.body);
  const updated: StoredProjectRecord = {
    ...project,
    gitOperations: {
      ...(project.gitOperations || {}),
      [operation.operationId]: operation
    },
    updatedAt: now()
  };

  await repo.upsertProject(updated);
  return res.json(operation);
});

app.post("/api/projects/:projectId/git/result", async (req, res) => {
  const project = await repo.getProject(req.params.projectId);
  if (!project) return res.status(404).json({ error: "Project not found" });

  const result = req.body;
  const updated: StoredProjectRecord = {
    ...project,
    gitResults: {
      ...(project.gitResults || {}),
      [result.operationId]: result
    },
    updatedAt: now()
  };

  await repo.upsertProject(updated);
  return res.json({ status: "recorded" });
});

app.post("/api/projects/:projectId/jobs/execute", async (req, res) => {
  const project = await repo.getProject(req.params.projectId);
  if (!project) return res.status(404).json({ error: "Project not found" });

  const job = createTriggerJob({
    projectId: project.projectId,
    type: "execute_next_packet",
    payload: { projectId: project.projectId }
  });

  jobRepo.save(job);

  return res.json({
    projectId: project.projectId,
    jobId: job.jobId,
    status: "queued"
  });
});

app.post("/api/projects/:projectId/jobs/:jobId/run", async (req, res) => {
  const project = await repo.getProject(req.params.projectId);
  const job = jobRepo.get(req.params.jobId);

  if (!project || !job) return res.status(404).json({ error: "Not found" });

  jobRepo.update(job.jobId, { status: "running" });

  try {
    let updatedState = advanceProject({
      projectId: project.projectId,
      status: project.status as any,
      packets: (project.plan as any)?.packets || [],
      runs: project.runs as any
    });

    let updated: StoredProjectRecord = {
      ...project,
      status: updatedState.status,
      plan: project.plan ? { ...(project.plan as any), packets: updatedState.packets } : null,
      runs: updatedState.runs,
      updatedAt: now()
    };

    const executingPacket = (updated.plan as any)?.packets?.find((p: any) => p.status === "executing");

    if (executingPacket) {
      const op = createGitOperation({
        projectId: updated.projectId,
        packetId: executingPacket.packetId,
        type: "create_branch",
        branchName: executingPacket.branchName
      });

      updated.gitOperations = {
        ...(updated.gitOperations || {}),
        [op.operationId]: op
      };

      const executor = process.env.EXECUTOR === "claude" ? ClaudeExecutorStub : MockExecutor;
      const result = await executor.execute({
        projectId: updated.projectId,
        packetId: executingPacket.packetId,
        branchName: executingPacket.branchName,
        goal: executingPacket.goal,
        requirements: executingPacket.requirements,
        constraints: executingPacket.constraints
      });

      if (result.success) {
        const validation = runValidation(updated.projectId, executingPacket.packetId);
        updated.validations = {
          ...(updated.validations || {}),
          [executingPacket.packetId]: validation
        };
        updatedState = markPacketComplete(updatedState, executingPacket.packetId);
      } else {
        throw new Error("Execution failed");
      }

      updated = {
        ...updated,
        status: updatedState.status,
        plan: { ...(updated.plan as any), packets: updatedState.packets },
        runs: updatedState.runs,
        updatedAt: now()
      };
    }

    await repo.upsertProject(updated);
    jobRepo.update(job.jobId, { status: "succeeded" });

    return res.json({
      projectId: updated.projectId,
      jobId: job.jobId,
      jobStatus: "succeeded",
      projectStatus: updated.status
    });
  } catch (err) {
    jobRepo.incrementRetry(job.jobId);
    const retryCount = jobRepo.get(job.jobId)?.retryCount || 0;
    const decision = getRetryDecision(retryCount);

    if (decision.shouldRetry) {
      jobRepo.update(job.jobId, { status: "queued" });
      return res.json({
        projectId: project.projectId,
        jobId: job.jobId,
        jobStatus: "retrying",
        retryCount,
        nextDelayMs: decision.nextDelayMs
      });
    }

    jobRepo.update(job.jobId, { status: "failed" });
    return res.json({
      projectId: project.projectId,
      jobId: job.jobId,
      jobStatus: "failed",
      retryCount
    });
  }
});

app.post("/api/projects/:projectId/execute-next", async (req, res) => {
  const project = await repo.getProject(req.params.projectId);
  if (!project || !project.plan) return res.status(404).json({ error: "No plan" });

  let updatedState = advanceProject({
    projectId: project.projectId,
    status: project.status as any,
    packets: (project.plan as any).packets,
    runs: project.runs as any
  });

  let updated: StoredProjectRecord = {
    ...project,
    status: updatedState.status,
    plan: { ...(project.plan as any), packets: updatedState.packets },
    runs: updatedState.runs,
    updatedAt: now()
  };

  const executingPacket = (updated.plan as any).packets.find((p: any) => p.status === "executing");

  if (executingPacket) {
    const op = createGitOperation({
      projectId: updated.projectId,
      packetId: executingPacket.packetId,
      type: "create_branch",
      branchName: executingPacket.branchName
    });

    updated.gitOperations = {
      ...(updated.gitOperations || {}),
      [op.operationId]: op
    };

    const executor = process.env.EXECUTOR === "claude" ? ClaudeExecutorStub : MockExecutor;
    const result = await executor.execute({
      projectId: updated.projectId,
      packetId: executingPacket.packetId,
      branchName: executingPacket.branchName,
      goal: executingPacket.goal,
      requirements: executingPacket.requirements,
      constraints: executingPacket.constraints
    });

    if (result.success) {
      const validation = runValidation(updated.projectId, executingPacket.packetId);
      updated.validations = {
        ...(updated.validations || {}),
        [executingPacket.packetId]: validation
      };
      updatedState = markPacketComplete(updatedState, executingPacket.packetId);
    } else {
      updatedState = markPacketFailed(updatedState, executingPacket.packetId);
    }

    updated = {
      ...updated,
      status: updatedState.status,
      plan: { ...(updated.plan as any), packets: updatedState.packets },
      runs: updatedState.runs,
      updatedAt: now()
    };
  }

  await repo.upsertProject(updated);
  return res.json({
    projectId: updated.projectId,
    status: updated.status,
    gitOperations: updated.gitOperations,
    gitResults: updated.gitResults
  });
});

app.get("/api/projects/:projectId/status", async (req, res) => {
  const project = await repo.getProject(req.params.projectId);
  if (!project) return res.status(404).json({ error: "Project not found" });

  return res.json(project);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`API running on ${PORT}`));
