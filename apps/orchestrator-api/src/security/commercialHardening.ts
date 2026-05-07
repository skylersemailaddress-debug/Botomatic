import type express from "express";

const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const LOCAL_ORIGINS = new Set(["http://127.0.0.1:3000", "http://localhost:3000", "http://127.0.0.1:3001", "http://localhost:3001"]);

export type RateLimitBucketName = "auth" | "operator" | "build" | "upload" | "deployment" | "ai_provider" | "default_mutation";

type BucketConfig = { windowMs: number; max: number };

type BucketState = { resetAt: number; count: number };

const DEFAULT_LIMITS: Record<RateLimitBucketName, BucketConfig> = {
  auth: { windowMs: 60_000, max: 10 },
  operator: { windowMs: 60_000, max: 30 },
  build: { windowMs: 60_000, max: 12 },
  upload: { windowMs: 60_000, max: 20 },
  deployment: { windowMs: 60_000, max: 10 },
  ai_provider: { windowMs: 60_000, max: 20 },
  default_mutation: { windowMs: 60_000, max: 120 },
};

const buckets = new Map<string, BucketState>();

export function redactSensitive(value: unknown): unknown {
  if (typeof value === "string") {
    return value
      .replace(/(Bearer\s+)[A-Za-z0-9._~+\/-]+/gi, "$1[REDACTED]")
      .replace(/(sk-(?:live|test|proj)?[_-]?[A-Za-z0-9]{8,})/g, "[REDACTED_OPENAI_KEY]")
      .replace(/(gh[pousr]_[A-Za-z0-9_]{20,})/g, "[REDACTED_GITHUB_TOKEN]")
      .replace(/(AKIA[0-9A-Z]{16})/g, "[REDACTED_AWS_KEY]")
      .replace(/(xox[baprs]-[0-9A-Za-z-]{10,})/g, "[REDACTED_SLACK_TOKEN]")
      .replace(/(-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----[\s\S]*?-----END (?:RSA |EC |OPENSSH )?PRIVATE KEY-----)/g, "[REDACTED_PRIVATE_KEY]")
      .replace(/\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/g, "[REDACTED_JWT]");
  }
  if (Array.isArray(value)) return value.map(redactSensitive);
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      if (/token|secret|password|api[_-]?key|authorization|service[_-]?role/i.test(key)) out[key] = "[REDACTED]";
      else out[key] = redactSensitive(item);
    }
    return out;
  }
  return value;
}

export function classifyCommercialRateLimitBucket(req: express.Request): RateLimitBucketName | null {
  const method = req.method.toUpperCase();
  const routePath = req.path;
  if (routePath.includes("/auth/login")) return "auth";
  if (!MUTATING_METHODS.has(method)) return null;
  if (/\/operator\/send$/.test(routePath)) return "operator";
  if (/\/build\/start$/.test(routePath) || /\/autonomous-build\/(start|resume|approve-blocker)$/.test(routePath)) return "build";
  if (/\/intake\/(file|pasted-text|github|cloud-link|local-manifest|source)$/.test(routePath) || routePath === "/api/projects/intake") return "upload";
  if (/\/deploy\//.test(routePath) || /\/governance\/approval$/.test(routePath)) return "deployment";
  if (/\/spec\/(analyze|clarify|build-contract|recommendations\/apply|assumptions\/accept)$/.test(routePath) || /\/universal\/capability-pipeline$/.test(routePath) || /\/self-upgrade\/spec$/.test(routePath) || /\/repo\/completion-contract$/.test(routePath)) return "ai_provider";
  return "default_mutation";
}

function clientKey(req: express.Request, bucket: RateLimitBucketName): string {
  const actor = req.header("x-user-id") || req.header("x-actor-id") || req.header("x-tenant-id") || req.ip || req.socket.remoteAddress || "unknown";
  const project = req.params?.projectId || "global";
  return `${bucket}:${actor}:${project}`;
}

export function createCommercialRateLimitMiddleware(overrides: Partial<Record<RateLimitBucketName, Partial<BucketConfig>>> = {}): express.RequestHandler {
  return (req, res, next) => {
    const bucket = classifyCommercialRateLimitBucket(req);
    if (!bucket) return next();
    const base = DEFAULT_LIMITS[bucket];
    const cfg = { ...base, ...(overrides[bucket] || {}) };
    const now = Date.now();
    const key = clientKey(req, bucket);
    const current = buckets.get(key);
    const state = !current || current.resetAt <= now ? { resetAt: now + cfg.windowMs, count: 0 } : current;
    state.count += 1;
    buckets.set(key, state);
    const remaining = Math.max(0, cfg.max - state.count);
    res.setHeader("RateLimit-Limit", String(cfg.max));
    res.setHeader("RateLimit-Remaining", String(remaining));
    res.setHeader("RateLimit-Reset", String(Math.ceil(state.resetAt / 1000)));
    res.setHeader("X-RateLimit-Bucket", bucket);
    if (state.count > cfg.max) {
      res.setHeader("Retry-After", String(Math.max(1, Math.ceil((state.resetAt - now) / 1000))));
      return res.status(429).json({ error: "Rate limit exceeded", code: "RATE_LIMITED", bucket });
    }
    return next();
  };
}

function allowedOriginsFromEnv(): Set<string> {
  const configured = (process.env.BOTOMATIC_ALLOWED_ORIGINS || process.env.NEXT_PUBLIC_APP_URL || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return new Set([...LOCAL_ORIGINS, ...configured]);
}

export function isAllowedSameOrigin(origin: string, hostHeader?: string): boolean {
  if (allowedOriginsFromEnv().has(origin)) return true;
  try {
    const originUrl = new URL(origin);
    const host = hostHeader ? new URL(hostHeader.includes("://") ? hostHeader : `http://${hostHeader}`).host : "";
    if (host && originUrl.host === host) return true;
    return process.env.NODE_ENV !== "production" && /^https:\/\/[a-z0-9-]+\.app\.github\.dev$/i.test(origin);
  } catch {
    return false;
  }
}

export function createSameOriginCsrfMiddleware(): express.RequestHandler {
  return (req, res, next) => {
    if (!MUTATING_METHODS.has(req.method.toUpperCase())) return next();
    const origin = req.header("origin");
    const site = (req.header("sec-fetch-site") || "").toLowerCase();
    if (site === "cross-site") {
      return res.status(403).json({ error: "Cross-site mutation blocked", code: "CSRF_BLOCKED" });
    }
    if (origin && !isAllowedSameOrigin(origin, req.header("host") || undefined)) {
      return res.status(403).json({ error: "Cross-site mutation blocked", code: "CSRF_BLOCKED" });
    }
    return next();
  };
}

export function createSecurityHeadersMiddleware(): express.RequestHandler {
  return (_req, res, next) => {
    res.setHeader("Content-Security-Policy", "default-src 'self'; base-uri 'self'; frame-ancestors 'none'; object-src 'none'; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self' http://127.0.0.1:* http://localhost:*");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=()");
    if (process.env.NODE_ENV === "production") {
      res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
    }
    next();
  };
}

export function resetCommercialRateLimitStateForTests() {
  buckets.clear();
}
