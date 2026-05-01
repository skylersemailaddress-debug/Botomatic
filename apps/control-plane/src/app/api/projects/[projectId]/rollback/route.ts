import { NextRequest, NextResponse } from "next/server";
import { sanitizeProjectId } from "@/server/executionStore";
import { loadLaunchProof } from "@/server/launchProofStore";

export async function POST(req: NextRequest, { params }: { params: { projectId: string } }) {
  const projectId = sanitizeProjectId(params.projectId);
  const body = await req.json().catch(() => ({}));
  const deploymentId = typeof body?.deploymentId === "string" ? body.deploymentId : "";

  if (!deploymentId) {
    return NextResponse.json({ error: { code: "bad_request", message: "deploymentId is required" } }, { status: 400 });
  }

  const record = loadLaunchProof(projectId);
  const exists = record?.deploymentRecords?.some((d) => d.deploymentId === deploymentId);

  if (!exists) {
    return NextResponse.json({ error: { code: "deployment_record_required", message: "Rollback requires deployment record" } }, { status: 409 });
  }

  return NextResponse.json({ status: "blocked", message: "Rollback action not connected" });
}
