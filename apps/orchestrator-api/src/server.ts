import express from "express";

const app = express();
app.use(express.json());

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

app.get("/api/projects/:projectId/status", (req, res) => {
  res.json({
    projectId: req.params.projectId,
    status: "intake",
    message: "Status endpoint placeholder"
  });
});

app.post("/api/projects/intake", (req, res) => {
  const { name, request } = req.body;

  res.json({
    projectId: "proj_mock",
    status: "clarifying",
    needsClarification: true,
    questions: [
      "Who are the main user roles?",
      "Is this single-tenant for MVP?"
    ]
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Orchestrator API running on port ${PORT}`);
});
