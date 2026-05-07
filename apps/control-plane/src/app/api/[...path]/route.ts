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

function isLocalDevelopment(): boolean {
  const environment = (process.env.BOTOMATIC_DEPLOYMENT_ENV || process.env.BOTOMATIC_ENV || process.env.VERCEL_ENV || process.env.NODE_ENV || "").toLowerCase();
  return process.env.NODE_ENV === "development" && !["production", "prod", "beta", "preview", "staging"].includes(environment);
}

function isLoopbackUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return host === "localhost" || host === "127.0.0.1" || host === "0.0.0.0";
  } catch {
    return true;
  }
}

function getBetaAuthToken(): string {
  return (process.env.BOTOMATIC_BETA_AUTH_TOKEN || "").trim();
}

function getAuthToken(): string {
  // BOTOMATIC_BETA_AUTH_TOKEN is the preferred token for local→hosted Railway sessions.
  const betaToken = getBetaAuthToken();
  if (betaToken) return betaToken;

  const configuredToken = (
    process.env.BOTOMATIC_API_TOKEN ||
    process.env.API_AUTH_TOKEN ||
    ""
  ).trim();

  if (configuredToken) return configuredToken;

  return isLocalDevelopment() ? (process.env.NEXT_PUBLIC_DEV_BEARER_TOKEN || "").trim() : "";
}

async function proxy(request: NextRequest, pathSegments: string[]) {
  const path = pathSegments.join("/");
  const proxyBase = getProxyBaseUrl();
  const targetUrl = `${proxyBase}/api/${path}${request.nextUrl.search}`;
  const headers = new Headers(request.headers);

  headers.delete("host");
  headers.delete("connection");

  const betaToken = getBetaAuthToken();

  if (betaToken) {
    // Validate token format before contacting Railway.
    if (!betaToken.startsWith("eyJ")) {
      return NextResponse.json(
        {
          error: "BOTOMATIC_BETA_AUTH_TOKEN does not look like a JWT (must start with eyJ). Check your local env and restart the dev server.",
          tokenSource: "BOTOMATIC_BETA_AUTH_TOKEN",
          tokenLooksLikeJwt: false,
          actorHeadersInjected: false,
        },
        { status: 401 },
      );
    }

    // Always overwrite — never let a client-supplied header take precedence.
    headers.set("authorization", `Bearer ${betaToken}`);
    headers.set("x-role", "admin");
    headers.set("x-user-id", (process.env.BOTOMATIC_BETA_USER_ID || "beta-smoke-admin").trim());
    headers.set("x-tenant-id", (process.env.BOTOMATIC_BETA_TENANT_ID || "beta-smoke-tenant").trim());
  } else if (!headers.has("authorization")) {
    const token = getAuthToken();
    if (token) {
      headers.set("authorization", `Bearer ${token}`);
    } else if (!isLoopbackUrl(proxyBase) && !["GET", "HEAD"].includes(request.method.toUpperCase())) {
      return NextResponse.json(
        {
          error: "Hosted API auth token is not configured for this local UI session.",
          hint: "Set BOTOMATIC_BETA_AUTH_TOKEN in your terminal and restart the dev server.",
          tokenSource: null,
          tokenLooksLikeJwt: false,
          actorHeadersInjected: false,
        },
        { status: 401 },
      );
    }
  }

  const init: RequestInit = {
    method: request.method,
    headers,
    redirect: "manual",
  };

  if (!["GET", "HEAD"].includes(request.method.toUpperCase())) {
    init.body = await request.arrayBuffer();
  }

  const upstream = await fetch(targetUrl, init);
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
