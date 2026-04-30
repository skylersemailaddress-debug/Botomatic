import { NextRequest, NextResponse } from "next/server";
import { emptyRuntime, loadRuntime } from "@/server/runtimeStore";
import { sanitizeProjectId } from "@/server/executionStore";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, { params }: { params: { projectId: string } }) {
  const projectId = sanitizeProjectId(params.projectId);
  const runtime = loadRuntime(projectId) ?? emptyRuntime(projectId);
  const limitRaw = Number(new URL(request.url).searchParams.get("limit") || "100");
  const limit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(200, limitRaw)) : 100;
  return NextResponse.json({ projectId, state: runtime.state, logs: runtime.logs.slice(-limit) });
}
