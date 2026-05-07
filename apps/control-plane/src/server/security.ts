import { NextRequest, NextResponse } from "next/server";

const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const LOCAL_ORIGINS = new Set(["http://127.0.0.1:3000", "http://localhost:3000"]);

type LimitState = { resetAt: number; count: number };
const loginBuckets = new Map<string, LimitState>();

export function applySecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set("Content-Security-Policy", "default-src 'self'; base-uri 'self'; frame-ancestors 'none'; object-src 'none'; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self' http://127.0.0.1:* http://localhost:*");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=()");
  if (process.env.NODE_ENV === "production") {
    response.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
  }
  return response;
}

function allowedOrigin(origin: string, request: NextRequest): boolean {
  if (LOCAL_ORIGINS.has(origin)) return true;
  const configured = (process.env.BOTOMATIC_ALLOWED_ORIGINS || process.env.NEXT_PUBLIC_APP_URL || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (configured.includes(origin)) return true;
  try {
    return new URL(origin).host === request.nextUrl.host;
  } catch {
    return false;
  }
}

export function blockCrossSiteMutation(request: NextRequest): NextResponse | null {
  if (!MUTATING_METHODS.has(request.method.toUpperCase())) return null;
  const origin = request.headers.get("origin");
  const site = (request.headers.get("sec-fetch-site") || "").toLowerCase();
  if (site === "cross-site" || (origin && !allowedOrigin(origin, request))) {
    return applySecurityHeaders(NextResponse.json({ error: "Cross-site mutation blocked", code: "CSRF_BLOCKED" }, { status: 403 }));
  }
  return null;
}

export function enforceLoginRateLimit(request: NextRequest): NextResponse | null {
  const key = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "local";
  const now = Date.now();
  const windowMs = 60_000;
  const max = Number(process.env.BOTOMATIC_LOGIN_RATE_LIMIT_MAX || 10);
  const current = loginBuckets.get(key);
  const state = !current || current.resetAt <= now ? { resetAt: now + windowMs, count: 0 } : current;
  state.count += 1;
  loginBuckets.set(key, state);
  if (state.count > max) {
    const response = NextResponse.json({ error: "Rate limit exceeded", code: "RATE_LIMITED", bucket: "auth" }, { status: 429 });
    response.headers.set("Retry-After", String(Math.max(1, Math.ceil((state.resetAt - now) / 1000))));
    response.headers.set("X-RateLimit-Bucket", "auth");
    return applySecurityHeaders(response);
  }
  return null;
}
