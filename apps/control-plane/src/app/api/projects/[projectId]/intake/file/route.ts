import { NextRequest, NextResponse } from "next/server";
import { requireControlPlaneProjectAccess } from "@/server/projectAccess";
import { sanitizeProjectId } from "@/server/executionStore";

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

export async function POST(
  request: NextRequest,
  { params }: { params: { projectId: string } },
) {
  const projectId = sanitizeProjectId(params.projectId);
  const deny = requireControlPlaneProjectAccess(request, projectId, "operator");
  if (deny) return deny;

  const headers = new Headers(request.headers);
  headers.delete("host");
  headers.delete("connection");

  const betaToken = (process.env.BOTOMATIC_BETA_AUTH_TOKEN || "").trim();
  const outboundToken = betaToken || (process.env.BOTOMATIC_API_TOKEN || "").trim();
  if (outboundToken) {
    headers.set("authorization", `Bearer ${outboundToken}`);
    headers.set("x-role", "admin");
    headers.set("x-user-id", (process.env.BOTOMATIC_BETA_USER_ID || "beta-smoke-admin").trim());
    headers.set("x-tenant-id", (process.env.BOTOMATIC_BETA_TENANT_ID || "beta-smoke-tenant").trim());
  }

  const upstreamUrl = `${getBackendBase()}/api/projects/${projectId}/intake/file${request.nextUrl.search}`;
  let upstream: Response;
  try {
    upstream = await fetch(upstreamUrl, {
      method: "POST",
      headers,
      body: await request.arrayBuffer(),
    });
  } catch (err) {
    return NextResponse.json(
      {
        error: "Backend unreachable",
        hint: "Railway API is not reachable. Check BOTOMATIC_API_BASE_URL.",
        details: err instanceof Error ? err.message : String(err),
      },
      { status: 502 },
    );
  }

  const responseHeaders = new Headers(upstream.headers);
  responseHeaders.delete("content-encoding");
  responseHeaders.delete("transfer-encoding");
  return new NextResponse(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: responseHeaders,
  });
}
