import { NextRequest, NextResponse } from "next/server";
import { sanitizeProjectId } from "@/server/executionStore";
import { loadLaunchProof, saveLaunchProof, emptyLaunchProof, appendLaunchLog, verifyLaunchPreconditions, getIdempotentResult, setIdempotentResult } from "@/server/launchProofStore";

export async function POST(req: NextRequest, { params }: { params: { projectId: string } }) {
  const projectId = sanitizeProjectId(params.projectId);
  const body = await req.json().catch(() => ({}));
  const idempotencyKey = typeof body?.idempotencyKey === "string" ? body.idempotencyKey : "";

  if (!idempotencyKey) {
    return NextResponse.json({ error: { code: "bad_request", message: "idempotencyKey is required" } }, { status: 400 });
  }

  let record = loadLaunchProof(projectId) ?? emptyLaunchProof(projectId);
  const idemKey = `launch:verify:${projectId}:${idempotencyKey}`;

  const existing = getIdempotentResult(record, idemKey);
  if (existing) {
    return NextResponse.json(record);
  }

  const check = verifyLaunchPreconditions(projectId);

  if (!check.ok) {
    record = appendLaunchLog(record, "error", `Launch verify blocked: ${check.missing.join(", ")}`);
    record.status = "blocked";
    record.message = "Launch proof missing";
    record.launchReady = false;
    record = setIdempotentResult(record, idemKey, "blocked");
    saveLaunchProof(projectId, record);
    return NextResponse.json({ error: { code: "blocked", message: "Launch proof missing", details: check.missing } }, { status: 409 });
  }

  const launchProof = check.proof;
  record.launchProof = launchProof;
  record.launchReady = true;
  record.status = "verified";
  record.message = "Launch proof verified";
  record.releaseEvidence = { launchReady: true, updatedAt: new Date().toISOString() };
  record = appendLaunchLog(record, "info", "Launch proof verified");
  record = setIdempotentResult(record, idemKey, launchProof.checksum || "verified");
  saveLaunchProof(projectId, record);

  return NextResponse.json(record);
}
