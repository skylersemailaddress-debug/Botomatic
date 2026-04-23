
// --- Deployment Layer ---
function ensureDeploymentState(project: any) {
  if (!project.deployments) {
    project.deployments = {
      dev: { environment: "dev", status: "idle" },
      staging: { environment: "staging", status: "idle" },
      prod: { environment: "prod", status: "idle" }
    };
  }
}

app.post("/api/projects/:projectId/deploy/promote", requireRole("admin", config), async (req, res) => {
  const actor = await getRequestActor(req, config);
  try {
    const { environment } = req.body;
    const project = await repo.getProject(req.params.projectId);
    if (!project) return res.status(404).json({ error: "Project not found" });

    const gate = buildGate(project);
    if (gate.launchStatus !== "ready") {
      return res.status(409).json({ error: "Cannot promote: gate not ready", issues: gate.issues });
    }

    ensureDeploymentState(project);

    project.deployments[environment] = {
      environment,
      status: "promoted",
      promotedAt: now(),
      promotedBy: actor.actorId
    };

    await persistProject(config, project);

    return res.json({ success: true, environment, actorId: actor.actorId });
  } catch (error) {
    return handleRouteError(res, config, error, "POST deploy/promote", actor);
  }
});

app.get("/api/projects/:projectId/ui/deployments", async (req, res) => {
  const actor = await getRequestActor(req, config);
  try {
    const project = await repo.getProject(req.params.projectId);
    if (!project) return res.status(404).json({ error: "Project not found" });

    ensureDeploymentState(project);

    return res.json({ deployments: project.deployments, actorId: actor.actorId });
  } catch (error) {
    return handleRouteError(res, config, error, "GET deployments", actor);
  }
});
