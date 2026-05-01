import { NextRequest, NextResponse } from "next/server";
import { sanitizeProjectId } from "@/server/executionStore";
import { loadLaunchProof, saveLaunchProof, createDeploymentRecord, hasVerifiedLaunchProof } from "@/server/launchProofStore";

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

  const deployment = createDeploymentRecord(projectId, "blocked", "Deploy action not connected");
  record.deploymentRecords.push(deployment);
  saveLaunchProof(projectId, record);

  return NextResponse.json({ deployment });
}
