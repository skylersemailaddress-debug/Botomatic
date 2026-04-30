import { NextRequest, NextResponse } from "next/server";
import { loadProjectState, sanitizeProjectId } from "@/server/executionStore";

export const dynamic = "force-dynamic";

export async function GET(_: NextRequest, { params }: { params: { projectId: string; runId: string } }) {
  const projectId = sanitizeProjectId(params.projectId);
  const state = loadProjectState(projectId);
  const run = state.runs.find((item) => item.runId === params.runId);
  if (!run) return NextResponse.json({ error: { code: "not_found", message: "Run not found", retryable: false, details: {} } }, { status: 404 });
  return NextResponse.json(run);
}
