import { NextRequest, NextResponse } from "next/server";
import { requireControlPlaneProjectAccess } from "@/server/projectAccess";

export const dynamic = "force-dynamic";

function getBackendBaseUrl(): string {
  const raw = (
    process.env.BOTOMATIC_API_PROXY_BASE_URL ||
    process.env.BOTOMATIC_API_BASE_URL ||
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    "http://127.0.0.1:3001"
  ).trim();
  return raw.endsWith("/") ? raw.slice(0, -1) : raw;
}

function buildAuthHeaders(): Headers {
  const h = new Headers();
  h.set("content-type", "application/json");
  const betaToken = (process.env.BOTOMATIC_BETA_AUTH_TOKEN || "").trim();
  if (betaToken) {
    h.set("authorization", `Bearer ${betaToken}`);
    h.set("x-role", "admin");
    h.set("x-user-id", (process.env.BOTOMATIC_BETA_USER_ID || "beta-smoke-admin").trim());
    h.set("x-tenant-id", (process.env.BOTOMATIC_BETA_TENANT_ID || "beta-smoke-tenant").trim());
  }
  return h;
}

export async function POST(
  request: NextRequest,
  { params }: { params: { projectId: string } },
) {
  const deny = requireControlPlaneProjectAccess(request, params.projectId, "operator");
  if (deny) return deny;

  let inputBody: Record<string, unknown> = {};
  try { inputBody = await request.json(); } catch { /* empty body ok */ }

  // If beta token not configured, forward the request's own auth headers instead.
  const outHeaders = buildAuthHeaders();
  if (!(process.env.BOTOMATIC_BETA_AUTH_TOKEN || "").trim()) {
    const auth = request.headers.get("authorization");
    if (auth) outHeaders.set("authorization", auth);
    const role = request.headers.get("x-role");
    if (role) outHeaders.set("x-role", role);
    const uid = request.headers.get("x-user-id");
    if (uid) outHeaders.set("x-user-id", uid);
    const tid = request.headers.get("x-tenant-id");
    if (tid) outHeaders.set("x-tenant-id", tid);
  }

  const upstreamUrl =
    `${getBackendBaseUrl()}/api/projects/${params.projectId}/autonomous-build/start`;

  let upstream: Response;
  try {
    upstream = await fetch(upstreamUrl, {
      method: "POST",
      headers: outHeaders,
      body: JSON.stringify(inputBody),
    });
  } catch (err) {
    return NextResponse.json(
      {
        error: "Backend unreachable",
        hint: "Railway API is not reachable. Check BOTOMATIC_API_BASE_URL and run npm run launch:beta:full:check.",
        details: err instanceof Error ? err.message : String(err),
      },
      { status: 502 },
    );
  }

  let data: Record<string, unknown> = {};
  try { data = await upstream.json(); } catch { /* non-JSON ok */ }

  if (!upstream.ok) {
    const hint =
      upstream.status === 401
        ? "Auth token invalid or expired. Re-run npm run launch:beta:full to refresh."
        : upstream.status === 403
        ? "Insufficient role. Admin or reviewer role required on Railway."
        : upstream.status === 404
        ? "autonomous-build/start not found on Railway backend."
        : undefined;

    return NextResponse.json(
      {
        error: (data as any)?.error || (data as any)?.message || `Upstream error ${upstream.status}`,
        upstreamStatus: upstream.status,
        details: data,
        ...(hint ? { hint } : {}),
      },
      { status: upstream.status },
    );
  }

  return NextResponse.json({
    projectId: params.projectId,
    status: (data as any)?.run?.status ?? (data as any)?.status ?? "queued",
    jobId:   (data as any)?.run?.runId   ?? (data as any)?.jobId   ?? null,
    nextStep: (data as any)?.nextStep ?? null,
    message:  (data as any)?.message  ?? "Build triggered on Railway",
    raw: data,
  });
}
