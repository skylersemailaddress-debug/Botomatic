import { postJson, ProviderResponse } from "./providerRuntime";

export async function callOpenAIV2(input: {
  model: string;
  prompt: string;
  apiKey?: string;
  baseUrl?: string;
}): Promise<ProviderResponse> {
  const url = input.baseUrl || "https://api.openai.com/v1/responses";
  const apiKey = input.apiKey || process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error("Missing OPENAI_API_KEY");
  }

  type OpenAIResponse = {
    output?: Array<{
      content?: Array<{
        text?: string;
      }>;
    }>;
  };

  const response = await postJson<OpenAIResponse>(
    url,
    {
      model: input.model,
      input: input.prompt,
    },
    {
      Authorization: `Bearer ${apiKey}`,
    }
  );

  const result = response.output?.[0]?.content?.[0]?.text || "";

  return {
    result,
    confidence: result ? 0.85 : 0.2,
    provider: "openai",
  };
}
