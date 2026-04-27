const DEFAULT_API_BASE_URL = "http://localhost:3001";

function normalizeApiBaseUrl(url: string): string {
  return url.endsWith("/") ? url.slice(0, -1) : url;
}

export function getApiBaseUrl(): string {
  const configuredBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (configuredBaseUrl) {
    return normalizeApiBaseUrl(configuredBaseUrl);
  }

  return DEFAULT_API_BASE_URL;
}

export function buildApiUrl(path: string): string {
  if (/^https?:\/\//.test(path)) {
    return path;
  }

  if (path.startsWith("/api/")) {
    const configuredBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
    if (configuredBaseUrl) {
      return `${normalizeApiBaseUrl(configuredBaseUrl)}${path}`;
    }

    // Keep API paths relative by default so Next.js rewrites can proxy in development.
    return path;
  }

  return path;
}

function buildHeaders(overrides: Record<string, string> = {}): Record<string, string> {
  const headers: Record<string, string> = {};

  // Add dev bearer token only in development builds.
  if (process.env.NODE_ENV === "development" && process.env.NEXT_PUBLIC_DEV_BEARER_TOKEN) {
    headers["Authorization"] = `Bearer ${process.env.NEXT_PUBLIC_DEV_BEARER_TOKEN}`;
  }

  return { ...headers, ...overrides };
}

async function buildFetchError(response: Response, finalUrl: string): Promise<Error> {
  let responseBody = "<empty>";
  try {
    responseBody = await response.text();
  } catch {
    responseBody = "<unreadable>";
  }

  return new Error(
    `Request failed: ${response.status} ${response.statusText} (${finalUrl}) Body: ${responseBody}`,
  );
}

export async function getJson<T>(url: string): Promise<T> {
  const finalUrl = buildApiUrl(url);
  const response = await fetch(finalUrl, {
    cache: "no-store",
    headers: buildHeaders(),
  });
  if (!response.ok) {
    throw await buildFetchError(response, finalUrl);
  }
  return response.json() as Promise<T>;
}

export async function postJson<T>(url: string, body?: unknown): Promise<T> {
  const finalUrl = buildApiUrl(url);
  const response = await fetch(finalUrl, {
    method: "POST",
    headers: buildHeaders({ "Content-Type": "application/json" }),
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!response.ok) {
    throw await buildFetchError(response, finalUrl);
  }
  return response.json() as Promise<T>;
}

export async function postMultipart<T>(url: string, formData: FormData): Promise<T> {
  const finalUrl = buildApiUrl(url);
  // Do not set Content-Type; browser sets it with boundary automatically.
  const response = await fetch(finalUrl, {
    method: "POST",
    headers: buildHeaders(),
    body: formData,
  });
  if (!response.ok) {
    throw await buildFetchError(response, finalUrl);
  }
  return response.json() as Promise<T>;
}
