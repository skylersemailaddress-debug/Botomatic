import { pool } from "./dbClient";
import { WorkflowRecord } from "../../modules/workflow";

export async function saveWorkflowDB(record: WorkflowRecord) {
  await pool.query(
    `INSERT INTO workflows (workflow_id, state, owner_role, updated_at)
     VALUES ($1,$2,$3,$4)
     ON CONFLICT (workflow_id)
     DO UPDATE SET state = EXCLUDED.state, owner_role = EXCLUDED.owner_role, updated_at = EXCLUDED.updated_at`,
    [record.workflowId, record.state, record.ownerRole, record.updatedAt]
  );
}

export async function getWorkflowDB(workflowId: string): Promise<WorkflowRecord | null> {
  const res = await pool.query(
    `SELECT * FROM workflows WHERE workflow_id = $1 LIMIT 1`,
    [workflowId]
  );
  const r = res.rows[0];
  if (!r) return null;
  return {
    workflowId: r.workflow_id,
    state: r.state,
    ownerRole: r.owner_role,
    updatedAt: r.updated_at,
  };
}
