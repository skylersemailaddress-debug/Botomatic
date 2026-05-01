import { NextRequest, NextResponse } from "next/server";
import { sanitizeProjectId } from "@/server/executionStore";
import { loadLaunchProof, saveLaunchProof, createDeploymentRecord } from "@/server/launchProofStore";

export async function POST(req: NextRequest, { params }: { params: { projectId: string } }) {
  const projectId = sanitizeProjectId(params.projectId);
  const body = await req.json().catch(() => ({}));
  const deploymentId = typeof body?.deploymentId === "string" ? body.deploymentId : "";

  if (!deploymentId) {
    return NextResponse.json({ error: { code: "bad_request", message: "deploymentId is required" } }, { status: 400 });
  }

  const record = loadLaunchProof(projectId);
  if (!record) {
    return NextResponse.json({ error: { code: "not_found", message: "No launch proof record" } }, { status: 404 });
  }

  const existing = record.deploymentRecords.find((d) => d.deploymentId === deploymentId);
  if (!existing) {
    return NextResponse.json({ error: { code: "deployment_record_required", message: "Rollback requires deployment record" } }, { status: 409 });
  }

  const rollback = createDeploymentRecord(projectId, "rolled_back", undefined, deploymentId, existing.target);
  record.deploymentRecords.push(rollback);
  saveLaunchProof(projectId, record);

  return NextResponse.json({ rollback });
}
