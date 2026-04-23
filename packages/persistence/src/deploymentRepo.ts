import { pool } from "./dbClient";
import { DeploymentRecord } from "../../release/src/environment";

export async function saveDeploymentDB(record: DeploymentRecord & { provider?: string; webhook_status?: string }) {
  await pool.query(
    `INSERT INTO deployments (deployment_id, project_id, environment, version, status, created_at, provider, webhook_status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
     ON CONFLICT (deployment_id)
     DO UPDATE SET project_id = EXCLUDED.project_id, environment = EXCLUDED.environment, version = EXCLUDED.version, status = EXCLUDED.status, created_at = EXCLUDED.created_at, provider = EXCLUDED.provider, webhook_status = EXCLUDED.webhook_status`,
    [
      record.deploymentId,
      record.projectId,
      record.environment,
      record.version,
      record.status,
      record.createdAt,
      record.provider || null,
      record.webhook_status || null,
    ]
  );
}

export async function getDeploymentsDB(projectId: string): Promise<(DeploymentRecord & { provider?: string; webhook_status?: string })[]> {
  const res = await pool.query(
    `SELECT * FROM deployments WHERE project_id = $1 ORDER BY created_at ASC`,
    [projectId]
  );

  return res.rows.map((r) => ({
    deploymentId: r.deployment_id,
    projectId: r.project_id,
    environment: r.environment,
    version: r.version,
    status: r.status,
    createdAt: r.created_at,
    provider: r.provider || undefined,
    webhook_status: r.webhook_status || undefined,
  }));
}
