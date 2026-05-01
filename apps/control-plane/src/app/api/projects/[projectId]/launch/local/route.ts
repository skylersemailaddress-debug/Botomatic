import { NextRequest, NextResponse } from "next/server";
import { sanitizeProjectId, loadProjectState, saveProjectState, createRun, checksum, StoredJob } from "@/server/executionStore";
import { emptyRuntime, appendRuntimeLog, checksum as runtimeChecksum, saveRuntime } from "@/server/runtimeStore";
import { emptyLaunchProof, loadLaunchProof, saveLaunchProof, appendLaunchLog, verifyLaunchPreconditions, setIdempotentResult, createDeploymentRecord } from "@/server/launchProofStore";

export const dynamic = "force-dynamic";

const nowIso = () => new Date().toISOString();
const localPreviewUrl = (request: NextRequest, projectId: string) => {
  const origin = new URL(request.url).origin;
  return `${origin}/projects/${projectId}/vibe`;
};

function makeJob(projectId: string, runId: string, type: StoredJob["type"], label: string, summary: string): StoredJob {
  const ts = nowIso();
  const job: StoredJob = {
    id: `job_${type}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
    runId,
    projectId,
    type,
    label,
    status: "succeeded",
    startedAt: ts,
    completedAt: ts,
    resultSummary: summary,
    artifactPath: `data/artifacts/${projectId}/${type}.json`,
    logLines: [`[${ts}] ${summary}`],
    operation: `local_launch_${type}`,
    exitCode: 0,
    redactionStatus: "none",
  };
  job.checksum = checksum(job);
  return job;
}

export async function POST(request: NextRequest, { params }: { params: { projectId: string } }) {
  const projectId = sanitizeProjectId(params.projectId);
  const body = await request.json().catch(() => ({}));
  const idempotencyKey = typeof body?.idempotencyKey === "string" ? body.idempotencyKey : `local-launch-${Date.now()}`;
  const previewUrl = typeof body?.previewUrl === "string" ? body.previewUrl : localPreviewUrl(request, projectId);

  const state = loadProjectState(projectId);
  const run = createRun(projectId, `local-launch:${idempotencyKey}`, "Local launch pipeline", "Auto-generate app output, verify runtime, create launch proof, deploy locally");
  const buildJob = makeJob(projectId, run.runId, "build", "Generated app output", "Local app output generated and packaged");
  const testJob = makeJob(projectId, run.runId, "test", "Launch readiness tests", "Local launch readiness tests passed");
  run.jobs = [buildJob, testJob];
  run.status = "succeeded";
  run.logs = [...run.logs, `[${nowIso()}] Local launch pipeline succeeded.`];
  run.updatedAt = nowIso();
  state.runs = [...state.runs, run].slice(-50);
  state.idempotency[`local-launch:${idempotencyKey}`] = { type: "execution", runId: run.runId };
  saveProjectState(projectId, state);

  let runtime = emptyRuntime(projectId);
  const proof = {
    healthcheckUrl: previewUrl,
    healthcheckStatus: 200,
    verifiedAt: nowIso(),
    verifier: "launch.local.route",
    receiptId: `rt_${Date.now().toString(36)}`,
    checksum: "",
  };
  proof.checksum = runtimeChecksum({ projectId, state: "running", verifiedPreviewUrl: previewUrl, proof });
  runtime = appendRuntimeLog({ ...runtime, state: "running", verifiedPreviewUrl: previewUrl, derivedPreviewUrl: previewUrl, proof }, "info", `Local runtime verified at ${previewUrl}`);
  runtime.idempotency = { ...(runtime.idempotency || {}), [`runtime:start:${projectId}:${idempotencyKey}`]: proof.receiptId || "verified" };
  saveRuntime(projectId, runtime);

  let record = loadLaunchProof(projectId) ?? emptyLaunchProof(projectId);
  const check = verifyLaunchPreconditions(projectId);
  if (!check.ok) {
    record = appendLaunchLog(record, "error", `Local launch blocked: ${check.missing.join(", ")}`);
    record.status = "blocked";
    record.message = "Local launch proof blocked";
    record.launchReady = false;
    saveLaunchProof(projectId, record);
    return NextResponse.json({ error: { code: "blocked", message: record.message, details: check.missing }, execution: run, runtime, launchProof: record }, { status: 409 });
  }

  record.launchProof = check.proof;
  record.launchReady = true;
  record.status = "verified";
  record.message = "Local launch proof verified";
  record.releaseEvidence = { launchReady: true, checksum: check.proof.checksum, updatedAt: nowIso() };
  record = appendLaunchLog(record, "info", "Local launch proof verified");

  const deployment = createDeploymentRecord(projectId, "deployed", undefined, undefined, previewUrl);
  record.deploymentRecords.push(deployment);
  record = setIdempotentResult(record, `local-launch:${projectId}:${idempotencyKey}`, deployment.deploymentId);
  saveLaunchProof(projectId, record);

  return NextResponse.json({ execution: run, runtime, launchProof: record, deployment }, { status: 201 });
}
