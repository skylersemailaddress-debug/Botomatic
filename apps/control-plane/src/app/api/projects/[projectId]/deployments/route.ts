import { NextResponse } from "next/server";
import { sanitizeProjectId } from "@/server/executionStore";
import { loadLaunchProof } from "@/server/launchProofStore";

export async function GET(_: Request, { params }: { params: { projectId: string } }) {
  const projectId = sanitizeProjectId(params.projectId);
  const record = loadLaunchProof(projectId);
  return NextResponse.json({ deployments: record?.deploymentRecords ?? [] });
}
