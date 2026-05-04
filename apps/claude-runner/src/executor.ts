import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { ExecuteRequest, ExecuteResponse, FileChange } from "./types.js";
import { detectWaveType, WaveType, buildSystemPrompt, buildUserPrompt } from "./domainPrompts.js";

// ── Model routing ─────────────────────────────────────────────────────────────
// Five tiers: council | flagship | general | fast | utility
// Council = hardest waves run Anthropic + Gemini + OpenAI in parallel, best wins.
// Fast    = deployment/validation waves use Gemini Flash (lowest latency capable model).
// Utility = scaffold/repo-layout uses GPT-4o-mini (cheapest capable model).

const MODEL_FLAGSHIP_PROVIDER = process.env.NEXUS_MODEL_FLAGSHIP_PROVIDER ?? "anthropic";
const MODEL_FLAGSHIP          = process.env.NEXUS_MODEL_FLAGSHIP          ?? "claude-opus-4-7";
const MODEL_GENERAL_PROVIDER  = process.env.NEXUS_MODEL_GENERAL_PROVIDER  ?? "anthropic";
const MODEL_GENERAL           = process.env.NEXUS_MODEL_GENERAL           ?? "claude-sonnet-4-6";
const MODEL_FAST_PROVIDER     = process.env.NEXUS_MODEL_FAST_PROVIDER     ?? "google";
const MODEL_FAST              = process.env.NEXUS_MODEL_FAST              ?? "gemini-2.0-flash";
const MODEL_UTILITY_PROVIDER  = process.env.NEXUS_MODEL_UTILITY_PROVIDER  ?? "openai";
const MODEL_UTILITY           = process.env.NEXUS_MODEL_UTILITY           ?? "gpt-4o-mini";

// Council mode: when enabled AND wave is council-tier, three providers vote.
const COUNCIL_ENABLED      = process.env.NEXUS_COUNCIL_MODEL_ENABLED      === "true";
const CONVERSATION_ENABLED = process.env.NEXUS_CONVERSATION_MODEL_ENABLED === "true";

const LOCAL_ENABLED       = process.env.NEXUS_MODEL_LOCAL_ENABLED         === "true";
const LOCAL_BASE_URL      = process.env.NEXUS_MODEL_LOCAL_BASE_URL        ?? "http://localhost:11434";
const LOCAL_LOW_RISK_ONLY = process.env.NEXUS_MODEL_LOCAL_LOW_RISK_ONLY   !== "false";

// ── Wave tier classification ──────────────────────────────────────────────────
// Council: deepest reasoning — auth, spec, factory, governance, proof, repair, memory
const COUNCIL_WAVES = new Set<WaveType>([
  "auth",
  "spec_compiler",
  "builder_factory",
  "governance_security",
  "fresh_clone_proof",
  "repair_replay",
  "truth_memory",
]);

// Fast: latency-sensitive and deterministic — validation, deployment
const FAST_WAVES = new Set<WaveType>([
  "validation_proof",
  "deployment_rollback",
]);

// Utility: cheap structural output — layout, generic scaffolding
const UTILITY_WAVES = new Set<WaveType>([
  "repo_layout",
  "generic",
]);

type Tier = "council" | "flagship" | "general" | "fast" | "utility" | "local";

function selectTier(waveType: WaveType): { provider: string; model: string; tier: Tier } {
  if (LOCAL_ENABLED && UTILITY_WAVES.has(waveType) && LOCAL_LOW_RISK_ONLY) {
    return { provider: "ollama", model: "llama3", tier: "local" };
  }
  if (COUNCIL_WAVES.has(waveType)) {
    // Council falls back to flagship if not enabled
    if (COUNCIL_ENABLED) return { provider: "council", model: "multi", tier: "council" };
    return { provider: MODEL_FLAGSHIP_PROVIDER, model: MODEL_FLAGSHIP, tier: "flagship" };
  }
  if (FAST_WAVES.has(waveType))    return { provider: MODEL_FAST_PROVIDER,    model: MODEL_FAST,    tier: "fast"    };
  if (UTILITY_WAVES.has(waveType)) return { provider: MODEL_UTILITY_PROVIDER, model: MODEL_UTILITY, tier: "utility" };
  return { provider: MODEL_GENERAL_PROVIDER, model: MODEL_GENERAL, tier: "general" };
}

// ── SDK clients (lazy) ────────────────────────────────────────────────────────
let _anthropic: Anthropic | null = null;
let _openai:    OpenAI    | null = null;
let _gemini:    OpenAI    | null = null;
let _azure:     OpenAI    | null = null;

function getAnthropic(): Anthropic {
  if (!_anthropic) _anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return _anthropic;
}

function getOpenAI(): OpenAI {
  if (!_openai) _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return _openai;
}

function getGemini(): OpenAI {
  if (!_gemini) {
    _gemini = new OpenAI({
      apiKey:  process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY ?? "",
      baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
    });
  }
  return _gemini;
}

function getAzure(): OpenAI {
  if (!_azure) {
    const endpoint = (process.env.AZURE_OPENAI_ENDPOINT ?? "").replace(/\/$/, "");
    const version  = process.env.AZURE_OPENAI_API_VERSION ?? "2024-10-21";
    _azure = new OpenAI({
      apiKey:  process.env.AZURE_OPENAI_API_KEY ?? "",
      baseURL: `${endpoint}/openai/deployments`,
      defaultHeaders: { "api-version": version },
      defaultQuery:   { "api-version": version },
    });
  }
  return _azure;
}

// ── Tool schemas ──────────────────────────────────────────────────────────────
const WRITE_FILES_TOOL_ANTHROPIC: Anthropic.Tool = {
  name: "write_files",
  description: "Write all generated source files for this wave packet. Every file must be complete and functional.",
  input_schema: {
    type: "object" as const,
    properties: {
      files: {
        type: "array",
        items: {
          type: "object",
          properties: {
            path: { type: "string" },
            body: { type: "string" },
          },
          required: ["path", "body"],
        },
      },
      summary: { type: "string" },
    },
    required: ["files", "summary"],
  },
};

const WRITE_FILES_TOOL_OPENAI: OpenAI.Chat.ChatCompletionTool = {
  type: "function",
  function: {
    name: "write_files",
    description: "Write all generated source files for this wave packet. Every file must be complete and functional.",
    parameters: {
      type: "object",
      properties: {
        files: {
          type: "array",
          items: {
            type: "object",
            properties: {
              path: { type: "string" },
              body: { type: "string" },
            },
            required: ["path", "body"],
          },
        },
        summary: { type: "string" },
      },
      required: ["files", "summary"],
    },
  },
};

// ── Health endpoint injection ─────────────────────────────────────────────────
function ensureHealthEndpoint(files: FileChange[]): FileChange[] {
  return files.map((f) => {
    const isServer =
      /server\.(ts|js|mjs)$/.test(f.path) &&
      f.body.includes("listen") &&
      !f.body.includes('"/health"') &&
      !f.body.includes("'/health'");

    if (!isServer) return f;

    const healthSnippet = `
  if (req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok" }));
    return;
  }
`;
    const injected = f.body.replace(
      /(createServer\s*\([^)]*\)\s*\{|app\.use\(express\.json\(\)\);\s*\n)/,
      (match) => match + healthSnippet
    );
    return { ...f, body: injected !== f.body ? injected : f.body };
  });
}

// ── Council scoring ───────────────────────────────────────────────────────────
// Weighted: file count (most important) + server/entry presence + total body bytes.
function scoreResult(r: { files: FileChange[]; summary: string }): number {
  const hasServer = r.files.some((f) =>
    /server\.(ts|js|mjs)$/.test(f.path) ||
    /index\.(ts|js|mjs)$/.test(f.path) ||
    /main\.(ts|js|mjs)$/.test(f.path)
  );
  const totalChars = r.files.reduce((n, f) => n + f.body.length, 0);
  return r.files.length * 100 + (hasServer ? 50 : 0) + Math.floor(totalChars / 200);
}

// ── Provider execution functions ──────────────────────────────────────────────

async function executeWithAnthropic(
  model: string,
  systemPrompt: string,
  userPrompt: string,
  logs: string[],
  conversationMode = false
): Promise<{ files: FileChange[]; summary: string } | null> {
  const messages: Anthropic.MessageParam[] = [{ role: "user", content: userPrompt }];

  if (conversationMode && CONVERSATION_ENABLED) {
    messages.push({ role: "assistant", content: "I'll generate complete, production-ready files for this wave. Let me analyze the requirements carefully." });
    messages.push({ role: "user",      content: "Good. Now use the write_files tool with complete, working code." });
    logs.push("conversation_mode=enabled");
  }

  // System prompt caching: identical across all packets — saves ~90% of system prompt tokens on hits.
  const response = await getAnthropic().messages.create({
    model,
    max_tokens: 8192,
    system: [{ type: "text", text: systemPrompt, cache_control: { type: "ephemeral" } }],
    tools: [WRITE_FILES_TOOL_ANTHROPIC],
    tool_choice: { type: "any" },
    messages,
  });

  logs.push(`anthropic_stop=${response.stop_reason}`);
  logs.push(`anthropic_in=${response.usage.input_tokens}`);
  logs.push(`anthropic_out=${response.usage.output_tokens}`);

  for (const block of response.content) {
    if (block.type === "tool_use" && block.name === "write_files") {
      const input = block.input as { files: FileChange[]; summary: string };
      return { files: input.files ?? [], summary: input.summary ?? "" };
    }
  }
  return null;
}

async function executeWithOpenAI(
  model: string,
  systemPrompt: string,
  userPrompt: string,
  logs: string[],
  clientOverride?: OpenAI,
  tag = "openai"
): Promise<{ files: FileChange[]; summary: string } | null> {
  const client = clientOverride ?? getOpenAI();
  const response = await client.chat.completions.create({
    model,
    max_tokens: 8192,
    tools: [WRITE_FILES_TOOL_OPENAI],
    tool_choice: { type: "function", function: { name: "write_files" } },
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user",   content: userPrompt   },
    ],
  });

  const choice = response.choices[0];
  logs.push(`${tag}_finish=${choice.finish_reason}`);
  logs.push(`${tag}_in=${response.usage?.prompt_tokens ?? 0}`);
  logs.push(`${tag}_out=${response.usage?.completion_tokens ?? 0}`);

  const toolCall = choice.message?.tool_calls?.[0];
  if (toolCall && "function" in toolCall && toolCall.function?.name === "write_files") {
    const input = JSON.parse(toolCall.function.arguments) as { files: FileChange[]; summary: string };
    return { files: input.files ?? [], summary: input.summary ?? "" };
  }
  return null;
}

async function executeWithGemini(
  model: string,
  systemPrompt: string,
  userPrompt: string,
  logs: string[]
): Promise<{ files: FileChange[]; summary: string } | null> {
  if (!process.env.GEMINI_API_KEY && !process.env.GOOGLE_API_KEY) {
    logs.push("gemini_key_missing=skip");
    return null;
  }
  return executeWithOpenAI(model, systemPrompt, userPrompt, logs, getGemini(), "gemini");
}

async function executeWithAzure(
  model: string,
  systemPrompt: string,
  userPrompt: string,
  logs: string[]
): Promise<{ files: FileChange[]; summary: string } | null> {
  if (!process.env.AZURE_OPENAI_API_KEY || !process.env.AZURE_OPENAI_ENDPOINT) {
    logs.push("azure_key_missing=skip");
    return null;
  }
  return executeWithOpenAI(model, systemPrompt, userPrompt, logs, getAzure(), "azure");
}

async function executeWithOllama(
  model: string,
  systemPrompt: string,
  userPrompt: string,
  logs: string[]
): Promise<{ files: FileChange[]; summary: string } | null> {
  const ollamaClient = new OpenAI({
    apiKey: "ollama",
    baseURL: `${LOCAL_BASE_URL}/v1`,
  });

  try {
    const response = await ollamaClient.chat.completions.create({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user",   content: userPrompt + '\n\nRespond ONLY with a JSON object: {"files": [{"path": "...", "body": "..."}], "summary": "..."}' },
      ],
      max_tokens: 8192,
    });

    const choice = response.choices[0];
    logs.push(`ollama_finish=${choice.finish_reason}`);

    const text = choice.message?.content ?? "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]) as { files: FileChange[]; summary: string };
      return { files: parsed.files ?? [], summary: parsed.summary ?? "" };
    }
  } catch (err) {
    logs.push(`ollama_error=${err instanceof Error ? err.message : String(err)}`);
  }
  return null;
}

// ── Council mode ──────────────────────────────────────────────────────────────
// All three providers (Anthropic + Gemini-2.5-pro + GPT-4o) run in parallel.
// Winner = highest composite score (file count + server entry + body size).
// Flagship always runs; others are skipped gracefully if keys are absent.
const COUNCIL_GEMINI_MODEL = process.env.NEXUS_COUNCIL_GEMINI_MODEL ?? "gemini-2.5-pro";
const COUNCIL_OPENAI_MODEL = process.env.NEXUS_COUNCIL_OPENAI_MODEL ?? "gpt-4o";

async function executeWithCouncil(
  systemPrompt: string,
  userPrompt: string,
  logs: string[]
): Promise<{ files: FileChange[]; summary: string } | null> {
  logs.push("council_mode=enabled");

  const [anthropicResult, geminiResult, openaiResult] = await Promise.allSettled([
    executeWithAnthropic(MODEL_FLAGSHIP, systemPrompt, userPrompt, logs, CONVERSATION_ENABLED),
    executeWithGemini(COUNCIL_GEMINI_MODEL, systemPrompt, userPrompt, logs),
    process.env.OPENAI_API_KEY
      ? executeWithOpenAI(COUNCIL_OPENAI_MODEL, systemPrompt, userPrompt, logs)
      : Promise.resolve(null),
  ]);

  const candidates: Array<{ name: string; result: { files: FileChange[]; summary: string } }> = [];
  const push = (name: string, settled: PromiseSettledResult<{ files: FileChange[]; summary: string } | null>) => {
    if (settled.status === "fulfilled" && settled.value && settled.value.files.length > 0) {
      candidates.push({ name, result: settled.value });
    }
  };

  push("anthropic", anthropicResult);
  push("gemini",    geminiResult);
  push("openai",    openaiResult);

  if (candidates.length === 0) return null;

  // Pick highest-scoring candidate
  candidates.sort((a, b) => scoreResult(b.result) - scoreResult(a.result));
  const winner = candidates[0];

  logs.push(`council_winner=${winner.name}`);
  for (const c of candidates) {
    logs.push(`council_${c.name}_files=${c.result.files.length}_score=${scoreResult(c.result)}`);
  }

  return winner.result;
}

// ── Main entry point ──────────────────────────────────────────────────────────
export async function executePacket(req: ExecuteRequest): Promise<ExecuteResponse> {
  const waveType    = detectWaveType(req.packetId, req.goal);
  const { provider, model, tier } = selectTier(waveType);
  const systemPrompt = buildSystemPrompt();
  const userPrompt   = buildUserPrompt(req, waveType);
  const isFlagship   = tier === "flagship" || tier === "council";

  const logs: string[] = [
    `wave_type=${waveType}`,
    `tier=${tier}`,
    `provider=${provider}`,
    `model=${model}`,
    `packet_id=${req.packetId}`,
    `council=${tier === "council"}`,
    `conversation=${CONVERSATION_ENABLED && isFlagship}`,
    `local_enabled=${LOCAL_ENABLED}`,
  ];

  try {
    let result: { files: FileChange[]; summary: string } | null = null;

    switch (tier) {
      case "council":
        result = await executeWithCouncil(systemPrompt, userPrompt, logs);
        break;

      case "local":
        result = await executeWithOllama(model, systemPrompt, userPrompt, logs);
        if (!result) {
          // Local failed — escalate to fast tier
          logs.push("ollama_fallback=fast");
          result = await executeWithGemini(MODEL_FAST, systemPrompt, userPrompt, logs)
            ?? await executeWithAnthropic(MODEL_GENERAL, systemPrompt, userPrompt, logs);
        }
        break;

      case "fast":
        result = await executeWithGemini(model, systemPrompt, userPrompt, logs);
        if (!result) {
          // Gemini unavailable — fall back to general Anthropic
          logs.push("fast_fallback=general");
          result = await executeWithAnthropic(MODEL_GENERAL, systemPrompt, userPrompt, logs);
        }
        break;

      case "utility":
        if (!process.env.OPENAI_API_KEY) {
          logs.push("openai_key_missing=fallback_general");
          result = await executeWithAnthropic(MODEL_GENERAL, systemPrompt, userPrompt, logs);
        } else {
          result = await executeWithOpenAI(model, systemPrompt, userPrompt, logs);
        }
        break;

      case "flagship":
        if (!process.env.ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY not set");
        result = await executeWithAnthropic(model, systemPrompt, userPrompt, logs, CONVERSATION_ENABLED);
        break;

      default:
        // general
        if (provider === "openai") {
          result = process.env.OPENAI_API_KEY
            ? await executeWithOpenAI(model, systemPrompt, userPrompt, logs)
            : await executeWithAnthropic(MODEL_GENERAL, systemPrompt, userPrompt, logs);
        } else if (provider === "google") {
          result = await executeWithGemini(model, systemPrompt, userPrompt, logs)
            ?? await executeWithAnthropic(MODEL_GENERAL, systemPrompt, userPrompt, logs);
        } else if (provider === "azure") {
          result = await executeWithAzure(model, systemPrompt, userPrompt, logs)
            ?? await executeWithAnthropic(MODEL_GENERAL, systemPrompt, userPrompt, logs);
        } else {
          if (!process.env.ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY not set");
          result = await executeWithAnthropic(model, systemPrompt, userPrompt, logs, isFlagship);
        }
    }

    if (!result) {
      logs.push("warn: model did not call write_files tool");
      return { success: false, summary: "Model did not call write_files tool", changedFiles: [], logs };
    }

    const rawFiles = result.files.filter(
      (f) => typeof f.path === "string" && typeof f.body === "string" && f.path.length > 0
    );
    const files = ensureHealthEndpoint(rawFiles);
    logs.push(`files_generated=${files.length}`);

    return {
      success: true,
      summary: result.summary || `Generated ${files.length} files for ${req.packetId}`,
      changedFiles: files,
      logs,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    logs.push(`error=${msg}`);
    return { success: false, summary: `Execution error: ${msg}`, changedFiles: [], logs };
  }
}
