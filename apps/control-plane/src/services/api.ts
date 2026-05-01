import type { ApiResult, TruthState } from "./truth";

const DEFAULT_API_BASE_URL = "http://localhost:3001";

function normalizeAppBaseUrl(url: string): string {
  return url.endsWith("/") ? url.slice(0, -1) : url;
}

function getServerAppBaseUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_APP_BASE_URL || process.env.BOTOMATIC_APP_BASE_URL;
  if (explicit) {
    return normalizeAppBaseUrl(explicit);
  }
  const port = process.env.PORT || "3000";
  return `http://127.0.0.1:${port}`;
}

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

    // On server-side render, use absolute same-origin URL so Node fetch can resolve it.
    if (typeof window === "undefined") {
      return `${getServerAppBaseUrl()}${path}`;
    }

    // In browser, keep API paths relative by default so same-origin routes/rewrites are used.
    return path;
  }

  return path;
}

function buildHeaders(overrides: Record<string, string> = {}): Record<string, string> {
  const headers: Record<string, string> = {};

  // Allow explicit public token for local authenticated stacks (production-mode local runs included).
  if (process.env.NEXT_PUBLIC_BOTOMATIC_API_TOKEN) {
    headers["Authorization"] = `Bearer ${process.env.NEXT_PUBLIC_BOTOMATIC_API_TOKEN}`;
  } else if (process.env.NEXT_PUBLIC_DEV_BEARER_TOKEN) {
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

export async function postMultipartWithProgress<T>(
  url: string,
  formData: FormData,
  options: {
    onUploadProgress?: (progressPercent: number) => void;
  } = {}
): Promise<T> {
  const finalUrl = buildApiUrl(url);
  const headers = buildHeaders();

  return new Promise<T>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", finalUrl, true);

    Object.entries(headers).forEach(([key, value]) => {
      xhr.setRequestHeader(key, value);
    });

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable || !options.onUploadProgress) {
        return;
      }
      const percent = Math.min(100, Math.max(0, Math.round((event.loaded / event.total) * 100)));
      options.onUploadProgress(percent);
    };

    xhr.onerror = () => {
      reject(new Error(`Request failed: network error (${finalUrl})`));
    };

    xhr.onload = () => {
      if (xhr.status < 200 || xhr.status >= 300) {
        reject(new Error(`Request failed: ${xhr.status} ${xhr.statusText} (${finalUrl}) Body: ${xhr.responseText || "<empty>"}`));
        return;
      }

      try {
        resolve(JSON.parse(xhr.responseText) as T);
      } catch {
        reject(new Error(`Request failed: invalid JSON response (${finalUrl})`));
      }
    };

    xhr.send(formData);
  });
}


function mapFailureState(status?: number): TruthState {
  if (status === 404) return "empty";
  if (status === 401 || status === 403) return "not_connected";
  return "error";
}

export async function getJsonSafe<T>(url: string): Promise<ApiResult<T>> {
  const finalUrl = buildApiUrl(url);
  try {
    const response = await fetch(finalUrl, { cache: "no-store", headers: buildHeaders() });
    if (!response.ok) {
      const message = `Request failed: ${response.status} ${response.statusText}`;
      if (response.status !== 404) console.warn("[api:getJsonSafe]", finalUrl, message);
      return { ok: false, state: mapFailureState(response.status), message, status: response.status };
    }
    return { ok: true, data: (await response.json()) as T };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown network error";
    console.warn("[api:getJsonSafe]", finalUrl, message);
    return { ok: false, state: "not_connected", message };
  }
}

export async function postJsonSafe<TResponse, TBody>(url: string, body: TBody): Promise<ApiResult<TResponse>> {
  const finalUrl = buildApiUrl(url);
  try {
    const response = await fetch(finalUrl, {
      method: "POST",
      headers: buildHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const message = `Request failed: ${response.status} ${response.statusText}`;
      if (response.status !== 404) console.warn("[api:postJsonSafe]", finalUrl, message);
      return { ok: false, state: mapFailureState(response.status), message, status: response.status };
    }

    return { ok: true, data: (await response.json()) as TResponse };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown network error";
    console.warn("[api:postJsonSafe]", finalUrl, message);
    return { ok: false, state: "not_connected", message };
  }
}
