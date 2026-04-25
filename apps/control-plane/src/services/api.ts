const DEFAULT_API_BASE_URL = "http://localhost:3001";

function normalizeApiBaseUrl(url: string): string {
  return url.endsWith("/") ? url.slice(0, -1) : url;
}

export function getApiBaseUrl(): string {
  return normalizeApiBaseUrl(
    process.env.NEXT_PUBLIC_API_BASE_URL || DEFAULT_API_BASE_URL,
  );
}

export function buildApiUrl(path: string): string {
  if (/^https?:\/\//.test(path)) {
    return path;
  }

  if (path.startsWith("/api/")) {
    return `${getApiBaseUrl()}${path}`;
  }

  return path;
}

function buildHeaders(overrides: Record<string, string> = {}): Record<string, string> {
  const headers: Record<string, string> = {};

  // Add Authorization header if dev bearer token is provided
  if (process.env.NEXT_PUBLIC_DEV_BEARER_TOKEN) {
    headers["Authorization"] = `Bearer ${process.env.NEXT_PUBLIC_DEV_BEARER_TOKEN}`;
  }

  return { ...headers, ...overrides };
}

export async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(buildApiUrl(url), {
    cache: "no-store",
    headers: buildHeaders(),
  });
  if (!response.ok) {
    let errorMessage = `Request failed: ${response.status}`;
    try {
      const data = await response.json();
      if (data.error) {
        errorMessage = data.error;
      }
    } catch {
      // Fall back to status-only error message
    }
    throw new Error(errorMessage);
  }
  return response.json() as Promise<T>;
}

export async function postJson<T>(url: string, body?: unknown): Promise<T> {
  const response = await fetch(buildApiUrl(url), {
    method: "POST",
    headers: buildHeaders({ "Content-Type": "application/json" }),
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!response.ok) {
    let errorMessage = `Request failed: ${response.status}`;
    try {
      const data = await response.json();
      if (data.error) {
        errorMessage = data.error;
      }
    } catch {
      // Fall back to status-only error message
    }
    throw new Error(errorMessage);
  }
  return response.json() as Promise<T>;
}
