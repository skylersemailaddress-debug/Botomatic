import { NextRequest, NextResponse } from "next/server";
import { sanitizeProjectId } from "@/server/executionStore";
import { emptyLaunchProof, loadLaunchProof, saveLaunchProof, appendLaunchLog } from "@/server/launchProofStore";

export const dynamic = "force-dynamic";

function validUrl(value: unknown): value is string {
  if (typeof value !== "string") return false;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest, { params }: { params: { projectId: string } }) {
  const projectId = sanitizeProjectId(params.projectId);
  const body = await request.json().catch(() => ({}));

  if (!validUrl(body?.previewUrl)) {
    const record = loadLaunchProof(projectId) ?? emptyLaunchProof(projectId);
    const next = appendLaunchLog(record, "error", "Local launch blocked: no generated app runtime preview URL was provided");
    next.status = "blocked";
    next.message = "No generated app runtime exists yet. Create a real app artifact and provide its previewUrl before launch.";
    next.launchReady = false;
    saveLaunchProof(projectId, next);

    return NextResponse.json({ error: { code: "NO_RUNTIME", message: next.message }, launchProof: next }, { status: 409 });
  }

  return NextResponse.json({ error: { code: "RUNTIME_REGISTRATION_NOT_IMPLEMENTED", message: "Runtime registration requires the real generator/runtime service and is intentionally not simulated." } }, { status: 501 });
}
