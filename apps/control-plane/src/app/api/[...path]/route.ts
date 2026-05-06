import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function normalizeBaseUrl(value: string | undefined): string {
  const raw = (value || "").trim();
  if (!raw) return "http://127.0.0.1:3001";
  return raw.endsWith("/") ? raw.slice(0, -1) : raw;
}

function getProxyBaseUrl(): string {
  return normalizeBaseUrl(
    process.env.BOTOMATIC_API_PROXY_BASE_URL ||
      process.env.BOTOMATIC_API_BASE_URL ||
      process.env.NEXT_PUBLIC_API_BASE_URL ||
      process.env.BOTOMATIC_API_URL,
  );
}

function getAuthToken(): string {
  // Only read server-side env vars — NEXT_PUBLIC_* are baked into the client bundle
  // and must never carry credentials.
  return (process.env.BOTOMATIC_API_TOKEN || process.env.API_AUTH_TOKEN || "").trim();
}

async function proxy(request: NextRequest, pathSegments: string[]) {
  const path = pathSegments.join("/");
  const targetUrl = `${getProxyBaseUrl()}/api/${path}${request.nextUrl.search}`;
  const headers = new Headers(request.headers);

  headers.delete("host");
  headers.delete("connection");

  if (!headers.has("authorization")) {
    const token = getAuthToken();
    if (token) headers.set("authorization", `Bearer ${token}`);
  }

  const init: RequestInit = {
    method: request.method,
    headers,
    redirect: "manual",
  };

  if (!["GET", "HEAD"].includes(request.method.toUpperCase())) {
    init.body = await request.arrayBuffer();
  }

  let upstream: Response;
  try {
    upstream = await fetch(targetUrl, init);
  } catch (err: any) {
    console.error(JSON.stringify({ event: "proxy_upstream_unreachable", target: targetUrl, error: String(err?.message || err) }));
    return NextResponse.json(
      { error: "Orchestrator API is unreachable. Please try again shortly.", code: "UPSTREAM_UNAVAILABLE" },
      { status: 502 }
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

type Params = { params: { path: string[] } };

export async function GET(request: NextRequest, ctx: Params) {
  return proxy(request, ctx.params.path);
}

export async function POST(request: NextRequest, ctx: Params) {
  return proxy(request, ctx.params.path);
}

export async function PUT(request: NextRequest, ctx: Params) {
  return proxy(request, ctx.params.path);
}

export async function PATCH(request: NextRequest, ctx: Params) {
  return proxy(request, ctx.params.path);
}

export async function DELETE(request: NextRequest, ctx: Params) {
  return proxy(request, ctx.params.path);
}

export async function OPTIONS(request: NextRequest, ctx: Params) {
  return proxy(request, ctx.params.path);
}
