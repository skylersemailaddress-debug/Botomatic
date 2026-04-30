import { NextRequest, NextResponse } from "next/server";
import { appendRuntimeLog, checksum, emptyRuntime, loadRuntime, sanitizeRuntimeUrl, saveRuntime } from "@/server/runtimeStore";
import { sanitizeProjectId } from "@/server/executionStore";

export const dynamic = "force-dynamic";
const readBody = async (request: NextRequest) => request.json().catch(() => ({}));

async function verifyTarget(url: string): Promise<{ ok: boolean; status?: number; reason?: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4000);
  try {
    const res = await fetch(url, { method: "GET", signal: controller.signal, cache: "no-store" });
    return { ok: res.status >= 200 && res.status < 400, status: res.status, reason: `healthcheck status ${res.status}` };
  } catch (error: any) {
    return { ok: false, reason: String(error?.message || "healthcheck failed") };
  } finally {
    clearTimeout(timer);
  }
}

export async function POST(request: NextRequest, { params }: { params: { projectId: string } }) {
  const projectId = sanitizeProjectId(params.projectId);
  const body = await readBody(request);
  const idempotencyKey = typeof body?.idempotencyKey === "string" ? body.idempotencyKey : "";
  if (!idempotencyKey) return NextResponse.json({ error: { code: "bad_request", message: "idempotencyKey is required", retryable: false, details: {} } }, { status: 400 });

  let runtime = loadRuntime(projectId) ?? emptyRuntime(projectId);
  const idemKey = `runtime:start:${projectId}:${idempotencyKey}`;
  if (runtime.idempotency?.[idemKey] && runtime.state === "running" && runtime.proof?.verifiedAt && runtime.verifiedPreviewUrl) return NextResponse.json(runtime);

  const healthcheckUrl = sanitizeRuntimeUrl(typeof body?.healthcheckUrl === "string" ? body.healthcheckUrl : runtime.proof?.healthcheckUrl);
  const verifiedPreviewUrl = sanitizeRuntimeUrl(typeof body?.verifiedPreviewUrl === "string" ? body.verifiedPreviewUrl : runtime.verifiedPreviewUrl);
  if (!healthcheckUrl || !verifiedPreviewUrl) {
    runtime = appendRuntimeLog({ ...runtime, state: "errored", lastError: "Runtime start requires verified preview target" }, "error", "Runtime start requires verified preview target");
    runtime.idempotency = { ...(runtime.idempotency || {}), [idemKey]: "blocked" };
    saveRuntime(projectId, runtime);
    return NextResponse.json({ error: { code: "blocked", message: "Runtime start requires verified preview target", retryable: false, details: {} }, runtime }, { status: 409 });
  }

  runtime = appendRuntimeLog({ ...runtime, state: "starting", lastError: undefined }, "info", `Starting runtime with healthcheck ${healthcheckUrl}`);
  const verification = await verifyTarget(healthcheckUrl);
  if (!verification.ok) {
    runtime = appendRuntimeLog({ ...runtime, state: "errored", lastError: verification.reason || "verification failed" }, "error", `Runtime verification failed: ${verification.reason || "unknown"}`);
    runtime.idempotency = { ...(runtime.idempotency || {}), [idemKey]: "failed" };
    saveRuntime(projectId, runtime);
    return NextResponse.json({ error: { code: "verification_failed", message: runtime.lastError, retryable: true, details: { healthcheckUrl, healthcheckStatus: verification.status } }, runtime }, { status: 502 });
  }

  const proof = { healthcheckUrl, healthcheckStatus: verification.status, verifiedAt: new Date().toISOString(), verifier: "runtime.start.route", receiptId: `rt_${Date.now().toString(36)}`, checksum: "" };
  proof.checksum = checksum({ projectId, state: "running", verifiedPreviewUrl, proof });
  runtime = appendRuntimeLog({ ...runtime, state: "running", verifiedPreviewUrl, proof, lastError: undefined }, "info", `Runtime verified at ${proof.verifiedAt}`);
  runtime.idempotency = { ...(runtime.idempotency || {}), [idemKey]: proof.receiptId };
  saveRuntime(projectId, runtime);
  return NextResponse.json(runtime, { status: 201 });
}
