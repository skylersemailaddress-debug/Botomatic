import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { ExecuteRequest, ExecuteResponse, FileChange } from "./types.js";
import { detectWaveType, WaveType, buildSystemPrompt, buildUserPrompt } from "./domainPrompts.js";

// ── Model routing ────────────────────────────────────────────────────────────
// Three tiers: flagship (deep reasoning), general (standard gen), utility (fast/cheap).

const MODEL_FLAGSHIP_PROVIDER = process.env.NEXUS_MODEL_FLAGSHIP_PROVIDER ?? "anthropic";
const MODEL_FLAGSHIP          = process.env.NEXUS_MODEL_FLAGSHIP          ?? "claude-sonnet-4-6";
const MODEL_GENERAL_PROVIDER  = process.env.NEXUS_MODEL_GENERAL_PROVIDER  ?? "anthropic";
const MODEL_GENERAL           = process.env.NEXUS_MODEL_GENERAL           ?? "claude-sonnet-4-6";
const MODEL_UTILITY_PROVIDER  = process.env.NEXUS_MODEL_UTILITY_PROVIDER  ?? "anthropic";
const MODEL_UTILITY           = process.env.NEXUS_MODEL_UTILITY           ?? "claude-sonnet-4-6";

// Council mode: multiple providers vote and the best result wins.
// Enabled when NEXUS_COUNCIL_MODEL_ENABLED=true AND wave is flagship-tier.
const COUNCIL_ENABLED = process.env.NEXUS_COUNCIL_MODEL_ENABLED === "true";

// Conversation mode: use extended thinking / multi-turn for flagship waves.
// Enabled when NEXUS_CONVERSATION_MODEL_ENABLED=true.
const CONVERSATION_ENABLED = process.env.NEXUS_CONVERSATION_MODEL_ENABLED === "true";

// Local/Ollama: only for low-risk utility waves when enabled.
const LOCAL_ENABLED      = process.env.NEXUS_MODEL_LOCAL_ENABLED === "true";
const LOCAL_BASE_URL     = process.env.NEXUS_MODEL_LOCAL_BASE_URL ?? "http://localhost:11434";
const LOCAL_LOW_RISK_ONLY = process.env.NEXUS_MODEL_LOCAL_LOW_RISK_ONLY !== "false"; // default true

// Wave types that require flagship-tier reasoning
const FLAGSHIP_WAVES = new Set<WaveType>([
  "auth",
  "spec_compiler",
  "builder_factory",
  "governance_security",
  "fresh_clone_proof",
  "repair_replay",
  "truth_memory",
]);

// Wave types suited to the cheap/fast utility tier
const UTILITY_WAVES = new Set<WaveType>([
  "repo_layout",
  "validation_proof",
  "generic",
]);

function selectTier(waveType: WaveType): { provider: string; model: string; tier: string } {
  // Local override: Ollama only handles utility waves when enabled and low-risk gate passes
  if (LOCAL_ENABLED && UTILITY_WAVES.has(waveType) && LOCAL_LOW_RISK_ONLY) {
    return { provider: "ollama", model: "llama3", tier: "local" };
  }
  if (FLAGSHIP_WAVES.has(waveType)) return { provider: MODEL_FLAGSHIP_PROVIDER, model: MODEL_FLAGSHIP, tier: "flagship" };
  if (UTILITY_WAVES.has(waveType))  return { provider: MODEL_UTILITY_PROVIDER,  model: MODEL_UTILITY,  tier: "utility"  };
  return { provider: MODEL_GENERAL_PROVIDER, model: MODEL_GENERAL, tier: "general" };
}

// ── SDK clients (lazy) ───────────────────────────────────────────────────────
let _anthropic: Anthropic | null = null;
let _openai: OpenAI | null = null;

function getAnthropic(): Anthropic {
  if (!_anthropic) _anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return _anthropic;
}

function getOpenAI(): OpenAI {
  if (!_openai) _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return _openai;
}

// ── Tool schemas ─────────────────────────────────────────────────────────────
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

// ── Provider execution functions ──────────────────────────────────────────────

async function executeWithAnthropic(
  model: string,
  systemPrompt: string,
  userPrompt: string,
  logs: string[],
  conversationMode = false
): Promise<{ files: FileChange[]; summary: string } | null> {
  const messages: Anthropic.MessageParam[] = [{ role: "user", content: userPrompt }];

  // Conversation mode: prime with a brief assistant ack for extended engagement
  if (conversationMode && CONVERSATION_ENABLED) {
    messages.push({ role: "assistant", content: "I'll generate complete, production-ready files for this wave. Let me analyze the requirements carefully." });
    messages.push({ role: "user", content: "Good. Now use the write_files tool with complete, working code." });
    logs.push("conversation_mode=enabled");
  }

  const response = await getAnthropic().messages.create({
    model,
    max_tokens: 8192,
    system: systemPrompt,
    tools: [WRITE_FILES_TOOL_ANTHROPIC],
    tool_choice: { type: "any" },
    messages,
  });

  logs.push(`stop_reason=${response.stop_reason}`);
  logs.push(`input_tokens=${response.usage.input_tokens}`);
  logs.push(`output_tokens=${response.usage.output_tokens}`);

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
  logs: string[]
): Promise<{ files: FileChange[]; summary: string } | null> {
  const response = await getOpenAI().chat.completions.create({
    model,
    max_tokens: 8192,
    tools: [WRITE_FILES_TOOL_OPENAI],
    tool_choice: { type: "function", function: { name: "write_files" } },
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
  });

  const choice = response.choices[0];
  logs.push(`finish_reason=${choice.finish_reason}`);
  logs.push(`input_tokens=${response.usage?.prompt_tokens ?? 0}`);
  logs.push(`output_tokens=${response.usage?.completion_tokens ?? 0}`);

  const toolCall = choice.message?.tool_calls?.[0];
  if (toolCall && "function" in toolCall && toolCall.function?.name === "write_files") {
    const input = JSON.parse(toolCall.function.arguments) as { files: FileChange[]; summary: string };
    return { files: input.files ?? [], summary: input.summary ?? "" };
  }
  return null;
}

async function executeWithOllama(
  model: string,
  systemPrompt: string,
  userPrompt: string,
  logs: string[]
): Promise<{ files: FileChange[]; summary: string } | null> {
  // Ollama uses OpenAI-compatible API at LOCAL_BASE_URL
  const ollamaClient = new OpenAI({
    apiKey: "ollama", // Ollama doesn't require a real key
    baseURL: `${LOCAL_BASE_URL}/v1`,
  });

  try {
    const response = await ollamaClient.chat.completions.create({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt + "\n\nRespond ONLY with a JSON object: {\"files\": [{\"path\": \"...\", \"body\": \"...\"}], \"summary\": \"...\"}" },
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

// ── Council mode: run flagship + utility in parallel, pick the winner ─────────
// "Winner" = whichever returns more files (richer output). Flagship breaks ties.
async function executeWithCouncil(
  systemPrompt: string,
  userPrompt: string,
  logs: string[]
): Promise<{ files: FileChange[]; summary: string } | null> {
  logs.push("council_mode=enabled");

  const [flagshipResult, utilityResult] = await Promise.allSettled([
    executeWithAnthropic(MODEL_FLAGSHIP, systemPrompt, userPrompt, logs, CONVERSATION_ENABLED),
    process.env.OPENAI_API_KEY
      ? executeWithOpenAI(MODEL_UTILITY, systemPrompt, userPrompt, logs)
      : Promise.resolve(null),
  ]);

  const flagship = flagshipResult.status === "fulfilled" ? flagshipResult.value : null;
  const utility  = utilityResult.status  === "fulfilled" ? utilityResult.value  : null;

  if (!flagship && !utility) return null;
  if (!flagship) return utility;
  if (!utility) return flagship;

  // Council decision: prefer whichever has more files; flagship wins ties
  const winner = utility.files.length > flagship.files.length ? utility : flagship;
  logs.push(`council_winner=${winner === flagship ? "flagship" : "utility"}`);
  logs.push(`council_flagship_files=${flagship.files.length}`);
  logs.push(`council_utility_files=${utility.files.length}`);
  return winner;
}

// ── Main entry point ──────────────────────────────────────────────────────────
export async function executePacket(req: ExecuteRequest): Promise<ExecuteResponse> {
  const waveType = detectWaveType(req.packetId, req.goal);
  const { provider, model, tier } = selectTier(waveType);
  const systemPrompt = buildSystemPrompt();
  const userPrompt = buildUserPrompt(req, waveType);
  const isFlagship = tier === "flagship";

  const logs: string[] = [
    `wave_type=${waveType}`,
    `tier=${tier}`,
    `provider=${provider}`,
    `model=${model}`,
    `packet_id=${req.packetId}`,
    `council=${COUNCIL_ENABLED && isFlagship}`,
    `conversation=${CONVERSATION_ENABLED && isFlagship}`,
    `local_enabled=${LOCAL_ENABLED}`,
  ];

  try {
    let result: { files: FileChange[]; summary: string } | null = null;

    // Council mode: flagship waves get multi-model consensus when enabled
    if (COUNCIL_ENABLED && isFlagship) {
      result = await executeWithCouncil(systemPrompt, userPrompt, logs);
    } else if (provider === "ollama") {
      result = await executeWithOllama(model, systemPrompt, userPrompt, logs);
      // Ollama fallback: if local fails, escalate to utility tier
      if (!result) {
        logs.push("ollama_fallback=utility");
        result = process.env.OPENAI_API_KEY
          ? await executeWithOpenAI(MODEL_UTILITY, systemPrompt, userPrompt, logs)
          : await executeWithAnthropic(MODEL_GENERAL, systemPrompt, userPrompt, logs);
      }
    } else if (provider === "openai") {
      if (!process.env.OPENAI_API_KEY) {
        logs.push("openai_key_missing=fallback_to_anthropic");
        result = await executeWithAnthropic(MODEL_GENERAL, systemPrompt, userPrompt, logs);
      } else {
        result = await executeWithOpenAI(model, systemPrompt, userPrompt, logs);
      }
    } else {
      // Anthropic (flagship or general)
      if (!process.env.ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY not set");
      result = await executeWithAnthropic(model, systemPrompt, userPrompt, logs, isFlagship);
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
