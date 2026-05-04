import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { ExecuteRequest, ExecuteResponse, FileChange } from "./types.js";
import { detectWaveType, WaveType, buildSystemPrompt, buildUserPrompt } from "./domainPrompts.js";

// ── Model routing ─────────────────────────────────────────────────────────────
// Six tiers: council | flagship | brainstorm | general | fast | utility | local
//
// Philosophy:
//   Claude  = organizer and builder — all code generation, auth, security, repair
//   OpenAI  = creative and brainstorming — spec analysis, architecture ideation, intelligence
//   Gemini  = speed tier — validation, deployment checks (lowest latency)
//   GPT-mini = cheap critic and scaffolding
//
// Cascade (council waves): Sonnet drafts → GPT-4o-mini critic evaluates →
//   if passRate < threshold, Opus rewrites with critic notes as constraints.

const MODEL_FLAGSHIP_PROVIDER  = process.env.NEXUS_MODEL_FLAGSHIP_PROVIDER  ?? "anthropic";
const MODEL_FLAGSHIP           = process.env.NEXUS_MODEL_FLAGSHIP           ?? "claude-opus-4-7";
const MODEL_GENERAL_PROVIDER   = process.env.NEXUS_MODEL_GENERAL_PROVIDER   ?? "anthropic";
const MODEL_GENERAL            = process.env.NEXUS_MODEL_GENERAL            ?? "claude-sonnet-4-6";
const MODEL_BRAINSTORM_PROVIDER= process.env.NEXUS_MODEL_BRAINSTORM_PROVIDER ?? "openai";
const MODEL_BRAINSTORM         = process.env.NEXUS_MODEL_BRAINSTORM         ?? "gpt-4o";
const MODEL_FAST_PROVIDER      = process.env.NEXUS_MODEL_FAST_PROVIDER      ?? "google";
const MODEL_FAST               = process.env.NEXUS_MODEL_FAST               ?? "gemini-2.0-flash";
const MODEL_UTILITY_PROVIDER   = process.env.NEXUS_MODEL_UTILITY_PROVIDER   ?? "openai";
const MODEL_UTILITY            = process.env.NEXUS_MODEL_UTILITY            ?? "gpt-4o-mini";

// Council mode: when enabled AND wave is council-tier, three providers vote.
const COUNCIL_ENABLED      = process.env.NEXUS_COUNCIL_MODEL_ENABLED      === "true";
const CONVERSATION_ENABLED = process.env.NEXUS_CONVERSATION_MODEL_ENABLED === "true";

const LOCAL_ENABLED       = process.env.NEXUS_MODEL_LOCAL_ENABLED         === "true";
const LOCAL_BASE_URL      = process.env.NEXUS_MODEL_LOCAL_BASE_URL        ?? "http://localhost:11434";
const LOCAL_LOW_RISK_ONLY = process.env.NEXUS_MODEL_LOCAL_LOW_RISK_ONLY   !== "false";

// ── Wave tier classification ──────────────────────────────────────────────────

// Council (Claude cascade): deep code-generation reasoning — auth, factory, security, proof, repair, memory
const COUNCIL_WAVES = new Set<WaveType>([
  "auth",
  "builder_factory",
  "governance_security",
  "fresh_clone_proof",
  "repair_replay",
  "truth_memory",
]);

// Brainstorm (OpenAI GPT-4o): creative analysis — spec ideation, architecture, AI features
const BRAINSTORM_WAVES = new Set<WaveType>([
  "spec_compiler",
  "intelligence_shell",
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

type Tier = "council" | "flagship" | "brainstorm" | "general" | "fast" | "utility" | "local";

function selectTier(waveType: WaveType): { provider: string; model: string; tier: Tier } {
  if (LOCAL_ENABLED && UTILITY_WAVES.has(waveType) && LOCAL_LOW_RISK_ONLY) {
    return { provider: "ollama", model: "llama3", tier: "local" };
  }
  if (COUNCIL_WAVES.has(waveType)) {
    if (COUNCIL_ENABLED) return { provider: "council", model: "multi", tier: "council" };
    return { provider: MODEL_FLAGSHIP_PROVIDER, model: MODEL_FLAGSHIP, tier: "flagship" };
  }
  if (BRAINSTORM_WAVES.has(waveType)) {
    // Falls back to Claude general if OpenAI key not available
    if (process.env.OPENAI_API_KEY) return { provider: MODEL_BRAINSTORM_PROVIDER, model: MODEL_BRAINSTORM, tier: "brainstorm" };
    return { provider: MODEL_GENERAL_PROVIDER, model: MODEL_GENERAL, tier: "general" };
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

// ── Critic pass ───────────────────────────────────────────────────────────────
// Runs a fast cheap model that evaluates a generated result against specific rubric.
// Returns issues[] and a passRate (0–1). Used in cascade to decide if escalation needed.

const CRITIC_MODEL          = process.env.NEXUS_CRITIC_MODEL          ?? "gpt-4o-mini";
const CRITIC_PROVIDER       = process.env.NEXUS_CRITIC_PROVIDER       ?? "openai";
const CRITIC_PASS_THRESHOLD = Number(process.env.NEXUS_CRITIC_THRESHOLD ?? "0.75");

async function runCriticPass(
  waveType: string,
  systemPrompt: string,
  userPrompt: string,
  result: { files: FileChange[]; summary: string },
  logs: string[]
): Promise<{ issues: string[]; passRate: number }> {
  const fileList = result.files.map(f => `${f.path} (${f.body.length} chars)`).join("\n");
  const hasHealth = result.files.some(f => f.body.includes("/health"));
  const hasServer = result.files.some(f => /server\.(ts|js)$/.test(f.path));

  // Extract required files from the user prompt's fileHints section
  const fileHintsMatch = userPrompt.match(/Required files:(.*?)(?:\n\n|$)/s);
  const requiredFilesHint = fileHintsMatch ? fileHintsMatch[1].trim() : "";

  const criticPrompt = `You are a code quality critic. Evaluate these generated files for a "${waveType}" wave.

Files generated:
${fileList}

Required files hint: ${requiredFilesHint || "not specified"}

Check ONLY these things and respond with JSON only — no prose:
1. Are at least 3 files generated? (minimum viable output)
2. Does a server/index file exist? (${hasServer ? "YES" : "NO"})
3. Does the server file include a /health endpoint? (${hasHealth ? "YES" : "NO"})
4. Are there any obviously broken patterns (e.g., imports from packages that don't exist, circular deps, missing required files)?
5. Does the summary describe what was built?

Respond ONLY with: {"issues": ["issue1", "issue2"], "passRate": 0.0-1.0}
passRate 1.0 = excellent, 0.75 = acceptable, below 0.75 = needs escalation to a stronger model.`;

  try {
    let criticResult: { files: FileChange[]; summary: string } | null = null;

    if (CRITIC_PROVIDER === "openai" && process.env.OPENAI_API_KEY) {
      const response = await getOpenAI().chat.completions.create({
        model: CRITIC_MODEL,
        max_tokens: 512,
        messages: [
          { role: "system", content: "You are a concise code critic. Respond only with JSON." },
          { role: "user",   content: criticPrompt },
        ],
      });
      const text = response.choices[0]?.message?.content ?? "{}";
      const parsed = JSON.parse(text.match(/\{[\s\S]*\}/)?.[0] ?? "{}") as { issues?: string[]; passRate?: number };
      logs.push(`critic_pass_rate=${parsed.passRate ?? 0}`);
      logs.push(`critic_issues=${(parsed.issues ?? []).length}`);
      return { issues: parsed.issues ?? [], passRate: parsed.passRate ?? 0 };
    } else if ((CRITIC_PROVIDER === "google" || !process.env.OPENAI_API_KEY) && (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY)) {
      const response = await getGemini().chat.completions.create({
        model: "gemini-2.0-flash",
        max_tokens: 512,
        messages: [
          { role: "system", content: "You are a concise code critic. Respond only with JSON." },
          { role: "user",   content: criticPrompt },
        ],
      });
      const text = response.choices[0]?.message?.content ?? "{}";
      const parsed = JSON.parse(text.match(/\{[\s\S]*\}/)?.[0] ?? "{}") as { issues?: string[]; passRate?: number };
      logs.push(`critic_pass_rate=${parsed.passRate ?? 0}`);
      return { issues: parsed.issues ?? [], passRate: parsed.passRate ?? 0 };
    }
  } catch (err) {
    logs.push(`critic_error=${err instanceof Error ? err.message : String(err)}`);
  }

  // If critic is unavailable, pass through (don't block the build)
  return { issues: [], passRate: 1.0 };
}

// ── Cascade + Critic (replaces council) ───────────────────────────────────────
// Step 1: Run fast Sonnet to get a first draft.
// Step 2: Critic evaluates the draft with a cheap model.
// Step 3: If passRate < threshold → escalate to Opus with critic issues as constraints.
// This is cheaper than 3× parallel council AND produces targeted improvements.
async function executeWithCascade(
  waveType: string,
  systemPrompt: string,
  userPrompt: string,
  logs: string[]
): Promise<{ files: FileChange[]; summary: string } | null> {
  logs.push("cascade_mode=enabled");

  // Step 1: Fast draft with general model
  logs.push("cascade_step=1_draft");
  const draftResult = await executeWithAnthropic(MODEL_GENERAL, systemPrompt, userPrompt, logs, false);

  if (!draftResult || draftResult.files.length === 0) {
    // Draft failed — go straight to flagship
    logs.push("cascade_draft_failed=escalating_to_flagship");
    return executeWithAnthropic(MODEL_FLAGSHIP, systemPrompt, userPrompt, logs, CONVERSATION_ENABLED);
  }

  // Step 2: Critic evaluation
  logs.push("cascade_step=2_critic");
  const { issues, passRate } = await runCriticPass(waveType, systemPrompt, userPrompt, draftResult, logs);

  if (passRate >= CRITIC_PASS_THRESHOLD) {
    logs.push(`cascade_accepted=draft_pass_rate=${passRate}`);
    return draftResult;
  }

  // Step 3: Escalate to flagship with critic's specific issues as hard constraints
  logs.push(`cascade_step=3_escalate_pass_rate=${passRate}`);
  const escalationConstraints = issues.length > 0
    ? `\n\nCRITIC REVIEW FOUND THESE ISSUES — FIX ALL OF THEM:\n${issues.map(i => `- ${i}`).join("\n")}`
    : "\n\nPrevious attempt was incomplete — generate a more thorough, complete implementation.";

  const escalatedResult = await executeWithAnthropic(
    MODEL_FLAGSHIP,
    systemPrompt,
    userPrompt + escalationConstraints,
    logs,
    CONVERSATION_ENABLED
  );

  if (!escalatedResult) {
    logs.push("cascade_escalation_failed=returning_draft");
    return draftResult;
  }

  // Pick the better result
  const draftScore    = scoreResult(draftResult);
  const escalateScore = scoreResult(escalatedResult);
  const winner = escalateScore >= draftScore ? escalatedResult : draftResult;
  logs.push(`cascade_final=escalated_wins=${escalateScore >= draftScore} draft_score=${draftScore} escalated_score=${escalateScore}`);
  return winner;
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
        // Cascade: Sonnet draft → GPT-mini critic → Opus escalation if needed
        result = await executeWithCascade(waveType, systemPrompt, userPrompt, logs);
        break;

      case "brainstorm":
        // OpenAI GPT-4o: creative spec analysis, architecture ideation, AI features
        result = await executeWithOpenAI(model, systemPrompt, userPrompt, logs);
        if (!result) {
          logs.push("brainstorm_fallback=claude_general");
          result = await executeWithAnthropic(MODEL_GENERAL, systemPrompt, userPrompt, logs);
        }
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
