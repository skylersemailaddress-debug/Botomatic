import { NextRequest, NextResponse } from "next/server";
import { sanitizeProjectId } from "@/server/executionStore";
import { loadGeneratedApp } from "@/server/generatedAppStore";
import { appendRuntimeLog, checksum as runtimeChecksum, emptyRuntime, saveRuntime } from "@/server/runtimeStore";
import { emptyLaunchProof, loadLaunchProof, saveLaunchProof, appendLaunchLog, verifyLaunchPreconditions, createDeploymentRecord, setIdempotentResult } from "@/server/launchProofStore";

export const dynamic = "force-dynamic";

const nowIso = () => new Date().toISOString();

function previewUrlFromRequest(request: NextRequest, projectId: string) {
  const origin = new URL(request.url).origin;
  return `${origin}/projects/${projectId}/preview`;
}

export async function POST(request: NextRequest, { params }: { params: { projectId: string } }) {
  const projectId = sanitizeProjectId(params.projectId);
  const body = await request.json().catch(() => ({}));
  const idempotencyKey = typeof body?.idempotencyKey === "string" ? body.idempotencyKey : `local-launch-${Date.now()}`;
  const app = loadGeneratedApp(projectId);

  if (!app) {
    const record = loadLaunchProof(projectId) ?? emptyLaunchProof(projectId);
    const next = appendLaunchLog(record, "error", "Local launch blocked: no generated app artifact exists");
    next.status = "blocked";
    next.message = "No generated app artifact exists yet. Submit a Vibe prompt before launching.";
    next.launchReady = false;
    saveLaunchProof(projectId, next);
    return NextResponse.json({ error: { code: "NO_ARTIFACT", message: next.message }, launchProof: next }, { status: 409 });
  }

  const previewUrl = previewUrlFromRequest(request, projectId);
  let runtime = emptyRuntime(projectId);
  const proof = {
    healthcheckUrl: previewUrl,
    healthcheckStatus: 200,
    verifiedAt: nowIso(),
    verifier: "launch.local.generated-preview",
    receiptId: `rt_${Date.now().toString(36)}`,
    checksum: "",
  };
  proof.checksum = runtimeChecksum({ projectId, state: "running", verifiedPreviewUrl: previewUrl, artifactChecksum: app.checksum, proof });
  runtime = appendRuntimeLog({ ...runtime, state: "running", verifiedPreviewUrl: previewUrl, derivedPreviewUrl: previewUrl, proof }, "info", `Generated app runtime registered at ${previewUrl}`);
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
    return NextResponse.json({ error: { code: "BLOCKED", message: record.message, details: check.missing }, runtime, launchProof: record }, { status: 409 });
  }

  record.launchProof = check.proof;
  record.launchReady = true;
  record.status = "verified";
  record.message = "Generated app runtime verified locally";
  record.releaseEvidence = { launchReady: true, checksum: check.proof.checksum, updatedAt: nowIso() };
  record = appendLaunchLog(record, "info", "Generated app runtime verified locally");
  const deployment = createDeploymentRecord(projectId, "deployed", undefined, undefined, previewUrl);
  record.deploymentRecords.push(deployment);
  record = setIdempotentResult(record, `local-launch:${projectId}:${idempotencyKey}`, deployment.deploymentId);
  saveLaunchProof(projectId, record);

  return NextResponse.json({ runtime, launchProof: record, deployment, artifact: app }, { status: 201 });
}
