export type ProviderRequest = {
  model: string;
  prompt: string;
  apiKey?: string;
  baseUrl?: string;
};

export type ProviderResponse = {
  result: string;
  confidence: number;
  provider: string;
};

export async function postJson<T>(url: string, body: unknown, headers: Record<string, string>): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Provider request failed ${response.status}: ${text}`);
  }

  return response.json() as Promise<T>;
}
