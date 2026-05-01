import { NextResponse } from "next/server";
import { loadLaunchProof, emptyLaunchProof } from "@/server/launchProofStore";
import { sanitizeProjectId } from "@/server/executionStore";

export async function GET(_: Request, { params }: { params: { projectId: string } }) {
  const projectId = sanitizeProjectId(params.projectId);
  const record = loadLaunchProof(projectId) ?? emptyLaunchProof(projectId);
  return NextResponse.json(record);
}
