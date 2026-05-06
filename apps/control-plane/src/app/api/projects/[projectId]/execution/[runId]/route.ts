import { NextRequest, NextResponse } from "next/server";
import { requireControlPlaneProjectAccess } from "@/server/projectAccess";
import { loadProjectState, sanitizeProjectId } from "@/server/executionStore";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, { params }: { params: { projectId: string; runId: string } }) {
  const projectId = sanitizeProjectId(params.projectId);
  const accessDenied = requireControlPlaneProjectAccess(request, projectId);
  if (accessDenied) return accessDenied;
  const state = loadProjectState(projectId);
  const run = state.runs.find((item) => item.runId === params.runId);
  if (!run) return NextResponse.json({ runId: params.runId, projectId, status: "queued", jobs: [], logs: [], updatedAt: new Date().toISOString() });
  return NextResponse.json(run);
}
