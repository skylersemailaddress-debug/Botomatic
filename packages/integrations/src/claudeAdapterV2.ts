import { postJson, ProviderResponse } from "./providerRuntime";

export async function callClaudeV2(input: {
  model: string;
  prompt: string;
  apiKey?: string;
  baseUrl?: string;
}): Promise<ProviderResponse> {
  const url = input.baseUrl || "https://api.anthropic.com/v1/messages";
  const apiKey = input.apiKey || process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    throw new Error("Missing ANTHROPIC_API_KEY");
  }

  type ClaudeResponse = {
    content?: Array<{
      text?: string;
    }>;
  };

  const response = await postJson<ClaudeResponse>(
    url,
    {
      model: input.model,
      max_tokens: 1000,
      messages: [{ role: "user", content: input.prompt }],
    },
    {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    }
  );

  const result = response.content?.[0]?.text || "";

  return {
    result,
    confidence: result ? 0.86 : 0.2,
    provider: "claude",
  };
}
