import { NextRequest, NextResponse } from "next/server";
import { sanitizeProjectId } from "@/server/executionStore";
import { loadLaunchProof, saveLaunchProof, createDeploymentRecord, hasVerifiedLaunchProof, getIdempotentResult, setIdempotentResult } from "@/server/launchProofStore";

export async function POST(req: NextRequest, { params }: { params: { projectId: string } }) {
  const projectId = sanitizeProjectId(params.projectId);
  const body = await req.json().catch(() => ({}));
  const idempotencyKey = typeof body?.idempotencyKey === "string" ? body.idempotencyKey : "";

  if (!idempotencyKey) {
    return NextResponse.json({ error: { code: "bad_request", message: "idempotencyKey is required" } }, { status: 400 });
  }

  const record = loadLaunchProof(projectId);
  if (!record || !hasVerifiedLaunchProof(record)) {
    return NextResponse.json({ error: { code: "launch_proof_required", message: "Deploy requires verified launch proof" } }, { status: 409 });
  }

  const idemKey = `deploy:${projectId}:${idempotencyKey}`;
  const existingId = getIdempotentResult(record, idemKey);

  if (existingId) {
    const existingDeployment = record.deploymentRecords.find((d) => d.deploymentId === existingId);
    if (existingDeployment) {
      return NextResponse.json({ deployment: existingDeployment });
    }
  }

  const deployment = createDeploymentRecord(projectId, "blocked", "Deploy action not connected");
  record.deploymentRecords.push(deployment);
  const updated = setIdempotentResult(record, idemKey, deployment.deploymentId);
  saveLaunchProof(projectId, updated);

  return NextResponse.json({ deployment });
}
