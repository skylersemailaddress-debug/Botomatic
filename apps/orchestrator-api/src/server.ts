import express from "express";
import { compileConversationToMasterTruth } from "../../../packages/master-truth/src/compiler";
import { generatePlan } from "../../../packages/packet-engine/src/generator";
import { advanceProject, markPacketComplete } from "../../../packages/execution/src/runner";

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
  projects.set(project.projectId, project);

  return res.json({ projectId: project.projectId, status: project.status, masterTruth: truth });
});

app.post("/api/projects/:projectId/plan", (req, res) => {
  const project = projects.get(req.params.projectId);
  if (!project || !project.masterTruth) return res.status(404).json({ error: "No master truth" });

  const plan = generatePlan(project.masterTruth);
  project.plan = plan;
  project.status = "queued";
  projects.set(project.projectId, project);

  return res.json({ projectId: project.projectId, status: project.status, plan });
});

app.post("/api/projects/:projectId/execute-next", (req, res) => {
  const project = projects.get(req.params.projectId);
  if (!project || !project.plan) return res.status(404).json({ error: "No plan" });

  const updated = advanceProject({
    projectId: project.projectId,
    status: project.status as any,
    packets: project.plan.packets
  });

  project.status = updated.status;
  project.plan.packets = updated.packets;
  projects.set(project.projectId, project);

  return res.json({ projectId: project.projectId, status: project.status, packets: project.plan.packets });
});

app.post("/api/projects/:projectId/complete-packet", (req, res) => {
  const { packetId } = req.body;
  const project = projects.get(req.params.projectId);
  if (!project || !project.plan) return res.status(404).json({ error: "No plan" });

  const updated = markPacketComplete(
    {
      projectId: project.projectId,
      status: project.status as any,
      packets: project.plan.packets
    },
    packetId
  );

  project.status = updated.status;
  project.plan.packets = updated.packets;
  projects.set(project.projectId, project);

  return res.json({ projectId: project.projectId, status: project.status });
});

app.get("/api/projects/:projectId/status", (req, res) => {
  const project = projects.get(req.params.projectId);
  if (!project) return res.status(404).json({ error: "Project not found" });

  return res.json(project);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`API running on ${PORT}`));
