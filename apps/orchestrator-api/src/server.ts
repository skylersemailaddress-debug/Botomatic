import express from "express";
import { compileConversationToMasterTruth } from "../../../packages/master-truth/src/compiler";
import { generatePlan } from "../../../packages/packet-engine/src/generator";

const app = express();
app.use(express.json());

type InMemoryProject = {
  projectId: string;
  name: string;
  request: string;
  status: string;
  masterTruth?: any;
  plan?: any;
};

const projects = new Map<string, InMemoryProject>();

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

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

  res.json({
    projectId,
    status: project.status,
    needsClarification: true,
    questions: [
      "Who are the main user roles?",
      "Is this single-tenant for MVP?"
    ]
  });
});

app.post("/api/projects/:projectId/compile", (req, res) => {
  const project = projects.get(req.params.projectId);
  if (!project) {
    return res.status(404).json({ error: "Project not found" });
  }

  const truth = compileConversationToMasterTruth({
    projectId: project.projectId,
    appName: project.name,
    request: project.request
  });

  project.masterTruth = truth;
  project.status = truth.status;
  projects.set(project.projectId, project);

  return res.json({
    projectId: project.projectId,
    status: project.status,
    masterTruth: truth,
    assumptions: truth.assumptions,
    summary: {
      appName: truth.appName,
      category: truth.category,
      features: truth.features,
      routes: truth.routes
    }
  });
});

app.post("/api/projects/:projectId/plan", (req, res) => {
  const project = projects.get(req.params.projectId);
  if (!project || !project.masterTruth) {
    return res.status(404).json({ error: "Compiled master truth not found" });
  }

  const plan = generatePlan(project.masterTruth);
  project.plan = plan;
  project.status = "queued";
  projects.set(project.projectId, project);

  return res.json({
    projectId: project.projectId,
    status: project.status,
    milestones: plan.milestones,
    packets: plan.packets
  });
});

app.get("/api/projects/:projectId/status", (req, res) => {
  const project = projects.get(req.params.projectId);
  if (!project) {
    return res.status(404).json({ error: "Project not found" });
  }

  const packets = project.plan?.packets ?? [];
  const currentPacket = packets.find((p: any) => p.status !== "complete") ?? null;

  return res.json({
    projectId: project.projectId,
    status: project.status,
    currentPacket,
    milestoneCount: project.plan?.milestones?.length ?? 0,
    packetCount: packets.length,
    preview: {
      status: "not_connected",
      url: null
    }
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Orchestrator API running on port ${PORT}`);
});
