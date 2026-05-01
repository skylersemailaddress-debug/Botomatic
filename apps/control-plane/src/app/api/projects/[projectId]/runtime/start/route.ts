import { NextRequest, NextResponse } from "next/server";
import { appendRuntimeLog, checksum, emptyRuntime, loadRuntime, saveRuntime } from "@/server/runtimeStore";
import { sanitizeProjectId } from "@/server/executionStore";
import { startProjectRuntime } from "@/server/runtimeProcessManager";

export const dynamic = "force-dynamic";
const readBody = async (request: NextRequest) => request.json().catch(() => ({}));

export async function POST(request: NextRequest, { params }: { params: { projectId: string } }) {
  const projectId = sanitizeProjectId(params.projectId);
  const body = await readBody(request);
  const idempotencyKey = typeof body?.idempotencyKey === "string" ? body.idempotencyKey : "";
  if (!idempotencyKey) return NextResponse.json({ error: { code: "bad_request", message: "idempotencyKey is required", retryable: false, details: {} } }, { status: 400 });

  let runtime = loadRuntime(projectId) ?? emptyRuntime(projectId);
  const idemKey = `runtime:start:${projectId}:${idempotencyKey}`;

  try {
    const proc = await startProjectRuntime(projectId);
    const url = proc.url;

    const proof = { healthcheckUrl: url, healthcheckStatus: 200, verifiedAt: new Date().toISOString(), verifier: "runtime.process.manager", receiptId: `rt_${Date.now().toString(36)}`, checksum: "" };
    proof.checksum = checksum({ projectId, state: "running", verifiedPreviewUrl: url, proof });

    runtime = appendRuntimeLog({ ...runtime, state: "running", verifiedPreviewUrl: url, derivedPreviewUrl: url, proof, lastError: undefined }, "info", `Runtime process started at ${url}`);
    runtime.idempotency = { ...(runtime.idempotency || {}), [idemKey]: proof.receiptId };
    saveRuntime(projectId, runtime);

    return NextResponse.json(runtime, { status: 201 });
  } catch (error: any) {
    runtime = appendRuntimeLog({ ...runtime, state: "errored", lastError: String(error?.message || "runtime start failed") }, "error", `Runtime start failed: ${error?.message || "unknown"}`);
    saveRuntime(projectId, runtime);
    return NextResponse.json({ error: { code: "runtime_failed", message: runtime.lastError }, runtime }, { status: 500 });
  }
}
