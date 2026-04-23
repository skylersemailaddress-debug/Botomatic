import { pool } from "./dbClient";
import { ProjectCheckpoint } from "../../memory/src/checkpoint";

export async function saveCheckpointDB(cp: ProjectCheckpoint) {
  await pool.query(
    `INSERT INTO checkpoints (checkpoint_id, project_id, kind, summary, state, created_at)
     VALUES ($1,$2,$3,$4,$5,$6)`,
    [cp.checkpointId, cp.projectId, cp.kind, cp.summary, JSON.stringify(cp.state), cp.createdAt]
  );
}

export async function getCheckpointsDB(projectId: string): Promise<ProjectCheckpoint[]> {
  const res = await pool.query(
    `SELECT * FROM checkpoints WHERE project_id = $1 ORDER BY created_at ASC`,
    [projectId]
  );

  return res.rows.map((r) => ({
    checkpointId: r.checkpoint_id,
    projectId: r.project_id,
    kind: r.kind,
    summary: r.summary,
    state: r.state,
    createdAt: r.created_at,
  }));
}
