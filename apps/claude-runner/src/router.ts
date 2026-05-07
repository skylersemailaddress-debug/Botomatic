/**
 * Multi-provider model router.
 *
 * Five task tiers, each with an ordered fallback chain. Providers are skipped
 * automatically if their API key is absent — no crash, no config required.
 *
 * Tier routing (goal keyword → primary provider → fallbacks):
 *
 *   reasoning    → Gemini 2.5 Pro → o3-mini → Claude Sonnet
 *   brainstorm   → GPT-4o → Gemini 2.5 Flash → Claude Sonnet
 *   code_complex → Claude Sonnet → Deepseek V3 → GPT-4o
 *   code_simple  → Deepseek V3 → Gemini 2.5 Flash → GPT-4o-mini
 *   utility      → Llama 3.3 70B (Groq) → GPT-4o-mini → Gemini 2.5 Flash
 */

import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import Groq from "groq-sdk";
import { GoogleGenAI } from "@google/genai";

// ── Task classification ──────────────────────────────────────────────────────

export type TaskType = "reasoning" | "brainstorm" | "code_complex" | "code_simple" | "utility";

const REASONING = /\b(system design|technical decision|compare approaches?|trade-?offs?|scalability|security model|performance model|migration strateg|design pattern|architectural|best approach for|which approach|pros and cons|evaluate options?|technical architecture|infrastructure design)\b/i;
const BRAINSTORM = /\b(brainstorm|ideate?|research|explore|discover|plan features?|feature ideas?|product spec|user stor(?:y|ies)|create concept|define the product|outline the feature|propose|think through|generate ideas?|what features?|how might we|creative exploration)\b/i;
const CODE_SIMPLE = /\b(scaffold|boilerplate|template|stub out|crud|add field|add property|add column|rename (?:file|class|function|method)|move file|copy file|generate (?:types?|interfaces?|enums?)|add (?:index|export))\b/i;
const UTILITY = /\b(comment|add (?:jsdoc|tsdoc|comments?|inline docs?)|readme|changelog|update docs?|lint|autoformat|sort imports?|organize imports?|add type annotations?|fix typo|bump version|update package\.json|remove unused)\b/i;

export function classifyTask(goal: string): TaskType {
  if (REASONING.test(goal)) return "reasoning";
  if (BRAINSTORM.test(goal)) return "brainstorm";
  if (UTILITY.test(goal)) return "utility";
  if (CODE_SIMPLE.test(goal)) return "code_simple";
  return "code_complex"; // default: Claude handles all ambiguous code tasks
}

// ── Provider result ──────────────────────────────────────────────────────────

export type ProviderResult = {
  text: string;
  providerName: string;
  model: string;
  tokenLog: string[];
};

// ── Model defaults (all overridable via env vars) ────────────────────────────

const MODELS = {
  claude_code: process.env.CLAUDE_RUNNER_MODEL || "claude-sonnet-4-6",
  claude_power: process.env.CLAUDE_POWER_MODEL || "claude-opus-4-7",
  openai_brainstorm: process.env.OPENAI_BRAINSTORM_MODEL || "gpt-4o",
  openai_reason: process.env.OPENAI_REASON_MODEL || "o3-mini",
  openai_fast: process.env.OPENAI_FAST_MODEL || "gpt-4o-mini",
  gemini_pro: process.env.GEMINI_PRO_MODEL || "gemini-2.5-pro",
  gemini_flash: process.env.GEMINI_FLASH_MODEL || "gemini-2.5-flash",
  groq_llama: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
  deepseek: process.env.DEEPSEEK_MODEL || "deepseek-chat",
};

export function getActiveModels() {
  return {
    reasoning: {
      chain: ["gemini_pro", "openai_reason", "claude_code"],
      primary: process.env.GOOGLE_AI_API_KEY ? `gemini/${MODELS.gemini_pro}` : process.env.OPENAI_API_KEY ? `openai/${MODELS.openai_reason}` : `anthropic/${MODELS.claude_code}`,
    },
    brainstorm: {
      chain: ["openai_brainstorm", "gemini_flash", "claude_code"],
      primary: process.env.OPENAI_API_KEY ? `openai/${MODELS.openai_brainstorm}` : process.env.GOOGLE_AI_API_KEY ? `gemini/${MODELS.gemini_flash}` : `anthropic/${MODELS.claude_code}`,
    },
    code_complex: {
      chain: ["claude_code", "deepseek", "openai_brainstorm"],
      primary: process.env.ANTHROPIC_API_KEY ? `anthropic/${MODELS.claude_code}` : process.env.DEEPSEEK_API_KEY ? `deepseek/${MODELS.deepseek}` : `openai/${MODELS.openai_brainstorm}`,
    },
    code_simple: {
      chain: ["deepseek", "gemini_flash", "openai_fast"],
      primary: process.env.DEEPSEEK_API_KEY ? `deepseek/${MODELS.deepseek}` : process.env.GOOGLE_AI_API_KEY ? `gemini/${MODELS.gemini_flash}` : `openai/${MODELS.openai_fast}`,
    },
    utility: {
      chain: ["groq_llama", "openai_fast", "gemini_flash"],
      primary: process.env.GROQ_API_KEY ? `groq/${MODELS.groq_llama}` : process.env.OPENAI_API_KEY ? `openai/${MODELS.openai_fast}` : process.env.GOOGLE_AI_API_KEY ? `gemini/${MODELS.gemini_flash}` : `anthropic/${MODELS.claude_code}`,
    },
  };
}

// ── Individual provider calls ────────────────────────────────────────────────

async function callAnthropic(model: string, system: string, user: string): Promise<ProviderResult> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
  const msg = await client.messages.create({
    model,
    max_tokens: 8192,
    system,
    messages: [{ role: "user", content: user }],
  });
  const text = msg.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");
  return {
    text,
    providerName: "anthropic",
    model: msg.model,
    tokenLog: [`input_tokens=${msg.usage.input_tokens}`, `output_tokens=${msg.usage.output_tokens}`],
  };
}

async function callOpenAI(model: string, system: string, user: string, baseURL?: string, apiKey?: string): Promise<ProviderResult> {
  const client = new OpenAI({ apiKey: apiKey ?? process.env.OPENAI_API_KEY!, ...(baseURL ? { baseURL } : {}) });
  const isReasoningModel = /^o[134]/i.test(model);
  const completion = await client.chat.completions.create({
    model,
    max_tokens: isReasoningModel ? undefined : 8192,
    messages: [
      ...(!isReasoningModel ? [{ role: "system" as const, content: system }] : []),
      { role: "user" as const, content: isReasoningModel ? `${system}\n\n${user}` : user },
    ],
  } as Parameters<typeof client.chat.completions.create>[0]);
  const text = completion.choices[0]?.message?.content || "";
  return {
    text,
    providerName: baseURL?.includes("deepseek") ? "deepseek" : "openai",
    model,
    tokenLog: [`prompt_tokens=${completion.usage?.prompt_tokens ?? 0}`, `completion_tokens=${completion.usage?.completion_tokens ?? 0}`],
  };
}

async function callGemini(model: string, system: string, user: string): Promise<ProviderResult> {
  const client = new GoogleGenAI({ apiKey: process.env.GOOGLE_AI_API_KEY! });
  const response = await client.models.generateContent({
    model,
    contents: user,
    config: {
      systemInstruction: system,
      maxOutputTokens: 8192,
    },
  });
  const text = response.text ?? "";
  const usage = (response as any).usageMetadata;
  return {
    text,
    providerName: "gemini",
    model,
    tokenLog: [
      `prompt_tokens=${usage?.promptTokenCount ?? 0}`,
      `completion_tokens=${usage?.candidatesTokenCount ?? 0}`,
    ],
  };
}

async function callGroq(model: string, system: string, user: string): Promise<ProviderResult> {
  const client = new Groq({ apiKey: process.env.GROQ_API_KEY! });
  const completion = await client.chat.completions.create({
    model,
    max_tokens: 8192,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
  });
  const text = completion.choices[0]?.message?.content || "";
  return {
    text,
    providerName: "groq",
    model,
    tokenLog: [
      `prompt_tokens=${completion.usage?.prompt_tokens ?? 0}`,
      `completion_tokens=${completion.usage?.completion_tokens ?? 0}`,
    ],
  };
}

// ── Provider chain definitions ───────────────────────────────────────────────

type ProviderSpec = {
  name: string;
  model: string;
  keyVar: string;
  call: (model: string, system: string, user: string) => Promise<ProviderResult>;
};

const PROVIDER_CHAINS: Record<TaskType, ProviderSpec[]> = {
  reasoning: [
    { name: "gemini", model: MODELS.gemini_pro, keyVar: "GOOGLE_AI_API_KEY", call: callGemini },
    { name: "openai", model: MODELS.openai_reason, keyVar: "OPENAI_API_KEY", call: callOpenAI },
    { name: "anthropic", model: MODELS.claude_code, keyVar: "ANTHROPIC_API_KEY", call: callAnthropic },
  ],
  brainstorm: [
    { name: "openai", model: MODELS.openai_brainstorm, keyVar: "OPENAI_API_KEY", call: callOpenAI },
    { name: "gemini", model: MODELS.gemini_flash, keyVar: "GOOGLE_AI_API_KEY", call: callGemini },
    { name: "anthropic", model: MODELS.claude_code, keyVar: "ANTHROPIC_API_KEY", call: callAnthropic },
  ],
  code_complex: [
    { name: "anthropic", model: MODELS.claude_code, keyVar: "ANTHROPIC_API_KEY", call: callAnthropic },
    { name: "deepseek", model: MODELS.deepseek, keyVar: "DEEPSEEK_API_KEY", call: (m, s, u) => callOpenAI(m, s, u, "https://api.deepseek.com", process.env.DEEPSEEK_API_KEY) },
    { name: "openai", model: MODELS.openai_brainstorm, keyVar: "OPENAI_API_KEY", call: callOpenAI },
  ],
  code_simple: [
    { name: "deepseek", model: MODELS.deepseek, keyVar: "DEEPSEEK_API_KEY", call: (m, s, u) => callOpenAI(m, s, u, "https://api.deepseek.com", process.env.DEEPSEEK_API_KEY) },
    { name: "gemini", model: MODELS.gemini_flash, keyVar: "GOOGLE_AI_API_KEY", call: callGemini },
    { name: "openai", model: MODELS.openai_fast, keyVar: "OPENAI_API_KEY", call: callOpenAI },
    { name: "anthropic", model: MODELS.claude_code, keyVar: "ANTHROPIC_API_KEY", call: callAnthropic },
  ],
  utility: [
    { name: "groq", model: MODELS.groq_llama, keyVar: "GROQ_API_KEY", call: callGroq },
    { name: "openai", model: MODELS.openai_fast, keyVar: "OPENAI_API_KEY", call: callOpenAI },
    { name: "gemini", model: MODELS.gemini_flash, keyVar: "GOOGLE_AI_API_KEY", call: callGemini },
    { name: "anthropic", model: MODELS.claude_code, keyVar: "ANTHROPIC_API_KEY", call: callAnthropic },
  ],
};

// ── Main execution with fallback chain ───────────────────────────────────────

function isTransientError(err: any): boolean {
  const msg = String(err?.message || err).toLowerCase();
  const status = Number(err?.status || err?.statusCode || 0);
  return status === 429 || status === 503 || status === 502 || msg.includes("rate limit") || msg.includes("overloaded") || msg.includes("timeout");
}

async function callWithRetry(
  provider: ProviderSpec,
  system: string,
  user: string,
  attempts: string[]
): Promise<ProviderResult | null> {
  const maxRetries = isTransientError ? 1 : 0;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await provider.call(provider.model, system, user);
      attempts.push(`ok:${provider.name}/${provider.model}${attempt > 0 ? `(retry${attempt})` : ""}`);
      return result;
    } catch (err: any) {
      const msg = String(err?.message || err).slice(0, 120);
      if (attempt < maxRetries && isTransientError(err)) {
        const delayMs = 2000 * (attempt + 1);
        attempts.push(`retry:${provider.name}/${provider.model}:${msg}:wait${delayMs}ms`);
        console.warn(JSON.stringify({ event: "provider_retry", provider: provider.name, model: provider.model, attempt, delayMs, error: msg }));
        await new Promise((r) => setTimeout(r, delayMs));
        continue;
      }
      attempts.push(`err:${provider.name}/${provider.model}:${msg}`);
      console.warn(JSON.stringify({ event: "provider_fallback", provider: provider.name, model: provider.model, error: msg }));
      return null;
    }
  }
  return null;
}

export async function executeWithRouter(
  task: TaskType,
  system: string,
  user: string
): Promise<ProviderResult & { task: TaskType; attempts: string[] }> {
  const chain = PROVIDER_CHAINS[task];
  const attempts: string[] = [];

  for (const provider of chain) {
    if (!process.env[provider.keyVar]) {
      attempts.push(`skip:${provider.name}/${provider.model}:no_key`);
      continue;
    }
    const result = await callWithRetry(provider, system, user, attempts);
    if (result) {
      return { ...result, task, attempts };
    }
  }

  throw new Error(`All providers failed for task=${task}. Attempts: ${attempts.join(" | ")}`);
}
