export type RuntimeEnvironment = "codespaces" | "local" | "lan" | "browser" | "unknown";

export type RuntimePreviewState = {
  status: "live" | "starting" | "stopped" | "not_connected" | "unknown";
  previewUrl?: string;
  displayUrl?: string;
  environment: RuntimeEnvironment;
  source: "backend" | "derived" | "unavailable";
  message?: string;
};

type BrowserContext = {
  origin?: string;
  hostname?: string;
  host?: string;
  protocol?: string;
};

type ResolveRuntimePreviewInput = {
  runtimeStatus?: string;
  previewUrl?: string;
  previewPort?: number;
  browser?: BrowserContext;
};

function normalizeStatus(status?: string): RuntimePreviewState["status"] {
  if (status === "live" || status === "starting" || status === "stopped" || status === "not_connected") return status;
  return "unknown";
}

function isPrivateLanIp(hostname: string): boolean {
  return /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[0-1])\.)/.test(hostname);
}

function detectEnvironment(hostname?: string): RuntimeEnvironment {
  if (!hostname) return "unknown";
  if (hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1") return "local";
  if (hostname.endsWith(".app.github.dev") || hostname.includes("codespaces") || hostname.endsWith("github.dev")) return "codespaces";
  if (isPrivateLanIp(hostname)) return "lan";
  return "browser";
}

export function normalizePreviewUrl(url?: string): string | undefined {
  if (!url) return undefined;
  try {
    const normalized = new URL(url);
    if (!["http:", "https:"].includes(normalized.protocol)) return undefined;
    return normalized.toString();
  } catch {
    return undefined;
  }
}

export function derivePreviewUrlFromBrowser(options: { browser?: BrowserContext; previewPort?: number } = {}): string | undefined {
  const browser = options.browser;
  if (!browser?.hostname) return undefined;
  const port = options.previewPort ?? 3000;
  const protocol = browser.protocol ?? "http:";
  const env = detectEnvironment(browser.hostname);

  if (env === "codespaces" && browser.host) {
    const replaced = browser.host.replace(/-\d+\.app\.github\.dev$/, `-${port}.app.github.dev`);
    if (replaced !== browser.host || browser.host.endsWith(".app.github.dev")) {
      return `${protocol}//${replaced}`;
    }
  }

  if (env === "local" || env === "lan" || env === "browser") {
    return `${protocol}//${browser.hostname}:${port}`;
  }

  return undefined;
}

export function resolveRuntimePreview(input: ResolveRuntimePreviewInput): RuntimePreviewState {
  const status = normalizeStatus(input.runtimeStatus);
  const normalizedBackendUrl = normalizePreviewUrl(input.previewUrl);
  const environment = detectEnvironment(input.browser?.hostname);

  if (normalizedBackendUrl) {
    return {
      status,
      previewUrl: normalizedBackendUrl,
      displayUrl: normalizedBackendUrl,
      environment,
      source: "backend",
    };
  }

  const derivedUrl = derivePreviewUrlFromBrowser({ browser: input.browser, previewPort: input.previewPort });
  if (derivedUrl) {
    return {
      status,
      previewUrl: derivedUrl,
      displayUrl: derivedUrl,
      environment,
      source: "derived",
      message: "Derived preview",
    };
  }

  return {
    status,
    environment,
    source: "unavailable",
    message: "Preview unavailable",
  };
}

export function getBrowserContext(): BrowserContext | undefined {
  if (typeof window === "undefined") return undefined;
  return {
    origin: window.location.origin,
    hostname: window.location.hostname,
    host: window.location.host,
    protocol: window.location.protocol,
  };
}
