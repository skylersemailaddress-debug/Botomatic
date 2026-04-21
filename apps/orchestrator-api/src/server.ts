import express from "express";
import { compileConversationToMasterTruth } from "../../../packages/master-truth/src/compiler";
import { generatePlan } from "../../../packages/packet-engine/src/generator";
import { advanceProject, markPacketComplete, markPacketFailed } from "../../../packages/execution/src/runner";
import { MockExecutor } from "../../../packages/executor-adapters/src/mockExecutor";
import { ClaudeExecutorStub } from "../../../packages/executor-adapters/src/claudeExecutorStub";
import { runValidation } from "../../../packages/validation/src/runner";
import { createGitOperation } from "../../../packages/github-adapter/src/operations";

const app = express();
app.use(express.json());

type InMemoryProject = {
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
};

const projects = new Map<string, InMemoryProject>();

app.post("/api/projects/intake", (req, res) => {
  const { name, request } = req.body;
  const projectId = `proj_${Date.now()}`;

  const project: InMemoryProject = {
    projectId,
    name,
    request,
    status: "clarifying"
  };

  projects.set(projectId, project);
  res.json({ projectId, status: project.status });
});

app.post("/api/projects/:projectId/compile", (req, res) => {
  const project = projects.get(req.params.projectId);
  if (!project) return res.status(404).json({ error: "Project not found" });

  const truth = compileConversationToMasterTruth({
    projectId: project.projectId,
    appName: project.name,
    request: project.request
  });

  project.masterTruth = truth;
  project.status = truth.status;

  return res.json({ projectId: project.projectId, status: project.status });
});

app.post("/api/projects/:projectId/plan", (req, res) => {
  const project = projects.get(req.params.projectId);
  if (!project || !project.masterTruth) return res.status(404).json({ error: "No master truth" });

  const plan = generatePlan(project.masterTruth);
  project.plan = plan;
  project.status = "queued";

  return res.json({ projectId: project.projectId, status: project.status });
});

// Request Git operation (intent)
app.post("/api/projects/:projectId/git/request", (req, res) => {
  const project = projects.get(req.params.projectId);
  if (!project) return res.status(404).json({ error: "Project not found" });

  const operation = createGitOperation(req.body);

  project.gitOperations = {
    ...(project.gitOperations || {}),
    [operation.operationId]: operation
  };

  return res.json(operation);
});

// Receive Git result (runtime writes back)
app.post("/api/projects/:projectId/git/result", (req, res) => {
  const project = projects.get(req.params.projectId);
  if (!project) return res.status(404).json({ error: "Project not found" });

  const result = req.body;

  project.gitResults = {
    ...(project.gitResults || {}),
    [result.operationId]: result
  };

  return res.json({ status: "recorded" });
});

app.post("/api/projects/:projectId/execute-next", async (req, res) => {
  const project = projects.get(req.params.projectId);
  if (!project || !project.plan) return res.status(404).json({ error: "No plan" });

  let updated = advanceProject({
    projectId: project.projectId,
    status: project.status as any,
    packets: project.plan.packets,
    runs: project.runs
  });

  project.status = updated.status;
  project.plan.packets = updated.packets;
  project.runs = updated.runs;

  const executingPacket = project.plan.packets.find((p: any) => p.status === "executing");

  if (executingPacket) {
    // Emit Git branch operation instead of executing directly
    const op = createGitOperation({
      projectId: project.projectId,
      packetId: executingPacket.packetId,
      type: "create_branch",
      branchName: executingPacket.branchName
    });

    project.gitOperations = {
      ...(project.gitOperations || {}),
      [op.operationId]: op
    };

    const executor = process.env.EXECUTOR === "claude" ? ClaudeExecutorStub : MockExecutor;

    const result = await executor.execute({
      projectId: project.projectId,
      packetId: executingPacket.packetId,
      branchName: executingPacket.branchName,
      goal: executingPacket.goal,
      requirements: executingPacket.requirements,
      constraints: executingPacket.constraints
    });

    if (result.success) {
      const validation = runValidation(project.projectId, executingPacket.packetId);

      project.validations = {
        ...(project.validations || {}),
        [executingPacket.packetId]: validation
      };

      updated = markPacketComplete(updated, executingPacket.packetId);
    } else {
      updated = markPacketFailed(updated, executingPacket.packetId);
    }

    project.status = updated.status;
    project.plan.packets = updated.packets;
    project.runs = updated.runs;
  }

  return res.json({
    projectId: project.projectId,
    status: project.status,
    gitOperations: project.gitOperations,
    gitResults: project.gitResults
  });
});

app.get("/api/projects/:projectId/status", (req, res) => {
  const project = projects.get(req.params.projectId);
  if (!project) return res.status(404).json({ error: "Project not found" });

  return res.json(project);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`API running on ${PORT}`));
