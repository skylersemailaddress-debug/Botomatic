import { NextRequest, NextResponse } from "next/server";
import { loadRuntime, sanitizeRuntimeUrl } from "@/server/runtimeStore";
import { sanitizeProjectId } from "@/server/executionStore";

export const dynamic = "force-dynamic";

export async function GET(_: NextRequest, { params }: { params: { projectId: string } }) {
  const projectId = sanitizeProjectId(params.projectId);
  const runtime = loadRuntime(projectId);
  if (!runtime) return NextResponse.json({ error: { code: "not_found", message: "Runtime not connected", retryable: false, details: { state: "stopped" } } }, { status: 404 });
  return NextResponse.json({ ...runtime, verifiedPreviewUrl: sanitizeRuntimeUrl(runtime.verifiedPreviewUrl), derivedPreviewUrl: sanitizeRuntimeUrl(runtime.derivedPreviewUrl) });
}
