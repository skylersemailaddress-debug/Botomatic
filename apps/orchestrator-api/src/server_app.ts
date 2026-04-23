/* PATCH START: Wave 3.4 UI routes */
  app.get("/api/projects/:projectId/ui/packets", async (req, res) => {
    const actor = getRequestActor(req, config);
    try {
      const project = await repo.getProject(req.params.projectId);
      if (!project) return res.status(404).json({ error: "Project not found" });
      const packets = (project.plan?.packets || []).map((p: any) => ({
        packetId: p.packetId,
        status: p.status,
        goal: p.goal,
        branchName: p.branchName
      }));
      return res.json({ packets, actorId: actor.actorId, workerId });
    } catch (error) {
      return handleRouteError(res, config, error, "GET packets", actor);
    }
  });

  app.get("/api/projects/:projectId/ui/artifacts", async (req, res) => {
    const actor = getRequestActor(req, config);
    try {
      const project = await repo.getProject(req.params.projectId);
      if (!project) return res.status(404).json({ error: "Project not found" });
      const artifacts = Object.values(project.gitResults || {}).map((r: any) => ({
        operationId: r.operationId,
        status: r.status,
        branchName: r.branchName,
        prUrl: r.prUrl || null,
        error: r.error || null
      }));
      return res.json({ artifacts, actorId: actor.actorId, workerId });
    } catch (error) {
      return handleRouteError(res, config, error, "GET artifacts", actor);
    }
  });
/* PATCH END */

