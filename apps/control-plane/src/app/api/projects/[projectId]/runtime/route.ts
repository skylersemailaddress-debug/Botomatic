import { NextRequest, NextResponse } from "next/server";
import { requireControlPlaneProjectAccess } from "@/server/projectAccess";
import { loadRuntime, sanitizeRuntimeUrl } from "@/server/runtimeStore";
import { sanitizeProjectId } from "@/server/executionStore";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, { params }: { params: { projectId: string } }) {
  const projectId = sanitizeProjectId(params.projectId);
  const accessDenied = requireControlPlaneProjectAccess(request, projectId);
  if (accessDenied) return accessDenied;
  const runtime = loadRuntime(projectId);
  if (!runtime) return NextResponse.json({ projectId, status: "stopped", state: "stopped", previewUrl: null, verifiedPreviewUrl: null, derivedPreviewUrl: null });
  return NextResponse.json({ ...runtime, verifiedPreviewUrl: sanitizeRuntimeUrl(runtime.verifiedPreviewUrl), derivedPreviewUrl: sanitizeRuntimeUrl(runtime.derivedPreviewUrl) });
}
