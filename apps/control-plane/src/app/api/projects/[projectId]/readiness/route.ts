import { NextRequest, NextResponse } from "next/server";
import { requireControlPlaneProjectAccess } from "@/server/projectAccess";

export const dynamic = "force-dynamic";

function getBackendBase(): string {
  const raw = (
    process.env.BOTOMATIC_API_PROXY_BASE_URL ||
    process.env.BOTOMATIC_API_BASE_URL ||
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    "http://127.0.0.1:3001"
  ).trim();
  return raw.endsWith("/") ? raw.slice(0, -1) : raw;
}

function buildOutboundHeaders(): Headers {
  const h = new Headers();
  h.set("content-type", "application/json");
  const betaToken = (process.env.BOTOMATIC_BETA_AUTH_TOKEN || "").trim();
  const outboundToken = betaToken || (process.env.BOTOMATIC_API_TOKEN || "").trim();
  if (outboundToken) {
    h.set("authorization", `Bearer ${outboundToken}`);
    h.set("x-role", "admin");
    h.set("x-user-id", (process.env.BOTOMATIC_BETA_USER_ID || "beta-smoke-admin").trim());
    h.set("x-tenant-id", (process.env.BOTOMATIC_BETA_TENANT_ID || "beta-smoke-tenant").trim());
  }
  return h;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { projectId: string } },
) {
  const deny = requireControlPlaneProjectAccess(request, params.projectId, "operator");
  if (deny) return deny;

  const upstreamUrl = `${getBackendBase()}/api/projects/${params.projectId}/readiness`;
  let upstream: Response;
  try {
    upstream = await fetch(upstreamUrl, { method: "GET", headers: buildOutboundHeaders() });
  } catch (err) {
    return NextResponse.json(
      { error: "Backend unreachable", details: err instanceof Error ? err.message : String(err) },
      { status: 502 },
    );
  }

  let data: Record<string, unknown> = {};
  try { data = await upstream.json(); } catch { /* non-JSON ok */ }

  if (!upstream.ok) {
    return NextResponse.json(
      { error: (data as any)?.error || `Upstream error ${upstream.status}`, upstreamStatus: upstream.status, details: data },
      { status: upstream.status },
    );
  }

  return NextResponse.json(data);
}
