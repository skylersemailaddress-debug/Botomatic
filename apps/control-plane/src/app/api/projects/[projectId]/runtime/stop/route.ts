import { NextRequest, NextResponse } from "next/server";
import { requireControlPlaneProjectAccess } from "@/server/projectAccess";
import { appendRuntimeLog, emptyRuntime, loadRuntime, saveRuntime } from "@/server/runtimeStore";
import { sanitizeProjectId } from "@/server/executionStore";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest, { params }: { params: { projectId: string } }) {
  const projectId = sanitizeProjectId(params.projectId);
  const accessDenied = requireControlPlaneProjectAccess(request, projectId);
  if (accessDenied) return accessDenied;
  const runtime = loadRuntime(projectId) ?? emptyRuntime(projectId);
  if (runtime.state === "stopped") return NextResponse.json(runtime);
  const stopping = appendRuntimeLog({ ...runtime, state: "stopping" }, "info", "Runtime stopping requested");
  const stopped = appendRuntimeLog({ ...stopping, state: "stopped", verifiedPreviewUrl: undefined, proof: undefined, lastError: undefined }, "info", "Runtime stopped");
  saveRuntime(projectId, stopped);
  return NextResponse.json(stopped);
}
