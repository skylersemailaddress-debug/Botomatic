import { pool } from "./dbClient";
import { ModelExecutionTrace } from "../../intelligence/src/executionTrace";

export async function saveExecutionTraceDB(trace: ModelExecutionTrace) {
  await pool.query(
    `INSERT INTO execution_traces (trace_id, capability, selected_model_id, attempted_model_ids, success, confidence, created_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7)
     ON CONFLICT (trace_id)
     DO UPDATE SET capability = EXCLUDED.capability, selected_model_id = EXCLUDED.selected_model_id, attempted_model_ids = EXCLUDED.attempted_model_ids, success = EXCLUDED.success, confidence = EXCLUDED.confidence, created_at = EXCLUDED.created_at`,
    [
      trace.traceId,
      trace.capability,
      trace.selectedModelId,
      JSON.stringify(trace.attemptedModelIds),
      trace.success,
      trace.confidence ?? null,
      trace.createdAt,
    ]
  );
}

export async function getExecutionTracesDB(capability?: string): Promise<ModelExecutionTrace[]> {
  const res = capability
    ? await pool.query(`SELECT * FROM execution_traces WHERE capability = $1 ORDER BY created_at ASC`, [capability])
    : await pool.query(`SELECT * FROM execution_traces ORDER BY created_at ASC`);

  return res.rows.map((r) => ({
    traceId: r.trace_id,
    capability: r.capability,
    selectedModelId: r.selected_model_id,
    attemptedModelIds: Array.isArray(r.attempted_model_ids) ? r.attempted_model_ids : JSON.parse(r.attempted_model_ids || "[]"),
    success: r.success,
    confidence: r.confidence ?? undefined,
    createdAt: r.created_at,
  }));
}
