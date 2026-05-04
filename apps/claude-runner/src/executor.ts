import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { ExecuteRequest, ExecuteResponse, FileChange } from "./types.js";
import { detectWaveType, WaveType, buildSystemPrompt, buildUserPrompt } from "./domainPrompts.js";

// ── Model routing ────────────────────────────────────────────────────────────
// Three tiers: flagship (deep reasoning), general (standard gen), utility (fast/cheap).
// Each tier has a provider + model ID, read from env with sensible defaults.

const MODEL_FLAGSHIP_PROVIDER = process.env.NEXUS_MODEL_FLAGSHIP_PROVIDER ?? "anthropic";
const MODEL_FLAGSHIP          = process.env.NEXUS_MODEL_FLAGSHIP          ?? "claude-sonnet-4-6";
const MODEL_GENERAL_PROVIDER  = process.env.NEXUS_MODEL_GENERAL_PROVIDER  ?? "anthropic";
const MODEL_GENERAL           = process.env.NEXUS_MODEL_GENERAL           ?? "claude-sonnet-4-6";
const MODEL_UTILITY_PROVIDER  = process.env.NEXUS_MODEL_UTILITY_PROVIDER  ?? "anthropic";
const MODEL_UTILITY           = process.env.NEXUS_MODEL_UTILITY           ?? "claude-sonnet-4-6";

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
  if (FLAGSHIP_WAVES.has(waveType)) return { provider: MODEL_FLAGSHIP_PROVIDER, model: MODEL_FLAGSHIP, tier: "flagship" };
  if (UTILITY_WAVES.has(waveType))  return { provider: MODEL_UTILITY_PROVIDER,  model: MODEL_UTILITY,  tier: "utility"  };
  return { provider: MODEL_GENERAL_PROVIDER, model: MODEL_GENERAL, tier: "general" };
}

// ── SDK clients (lazy — only instantiate when actually needed) ───────────────
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

// ── Tool schema (shared across providers) ───────────────────────────────────
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

// ── Health endpoint injection ────────────────────────────────────────────────
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

// ── Provider-specific execution ──────────────────────────────────────────────
async function executeWithAnthropic(
  model: string,
  systemPrompt: string,
  userPrompt: string,
  logs: string[]
): Promise<{ files: FileChange[]; summary: string } | null> {
  const response = await getAnthropic().messages.create({
    model,
    max_tokens: 8192,
    system: systemPrompt,
    tools: [WRITE_FILES_TOOL_ANTHROPIC],
    tool_choice: { type: "any" },
    messages: [{ role: "user", content: userPrompt }],
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

// ── Main entry point ─────────────────────────────────────────────────────────
export async function executePacket(req: ExecuteRequest): Promise<ExecuteResponse> {
  const waveType = detectWaveType(req.packetId, req.goal);
  const { provider, model, tier } = selectTier(waveType);
  const systemPrompt = buildSystemPrompt();
  const userPrompt = buildUserPrompt(req, waveType);

  const logs: string[] = [
    `wave_type=${waveType}`,
    `tier=${tier}`,
    `provider=${provider}`,
    `model=${model}`,
    `packet_id=${req.packetId}`,
  ];

  try {
    let result: { files: FileChange[]; summary: string } | null = null;

    if (provider === "openai") {
      if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY not set — cannot use utility tier");
      result = await executeWithOpenAI(model, systemPrompt, userPrompt, logs);
    } else {
      // Default to Anthropic for flagship + general tiers
      if (!process.env.ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY not set");
      result = await executeWithAnthropic(model, systemPrompt, userPrompt, logs);

      // If utility tier and OpenAI unavailable, Anthropic fallback already ran above
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
