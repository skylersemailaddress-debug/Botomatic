import express from "express";
import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { ExecuteRequest, ExecuteResponse, FileChange } from "./types";

const app = express();
app.use(express.json());

// ── Model config ────────────────────────────────────────────────────────────
// Claude: code generation, structure, implementation, refactoring
// OpenAI: brainstorming, feature design, architecture ideation, spec creation
const CLAUDE_MODEL = process.env.CLAUDE_RUNNER_MODEL || "claude-sonnet-4-6";
const OPENAI_BRAINSTORM_MODEL = process.env.OPENAI_BRAINSTORM_MODEL || "gpt-4o";
const OPENAI_FAST_MODEL = process.env.OPENAI_FAST_MODEL || "gpt-4o-mini";

// Keywords that indicate a brainstorm/design/creative packet → route to OpenAI
const OPENAI_GOAL_PATTERN = /\b(brainstorm|design|ideate|research|explore|discover|plan features?|feature ideas?|product spec|user stor|create concept|define|outline the|propose|suggest|think through|architecture overview|describe the|what should|how should|generate ideas?)\b/i;
// Keywords that indicate a pure structure/light task → route to cheaper model
const FAST_GOAL_PATTERN = /\b(rename|move|comment|docs?|readme|changelog|bump version|update package|lint|format|sort imports?|add type|stub)\b/i;

type RoutedModel = { provider: "anthropic"; model: string } | { provider: "openai"; model: string };

function routeModel(goal: string): RoutedModel {
  if (OPENAI_GOAL_PATTERN.test(goal)) {
    return { provider: "openai", model: OPENAI_BRAINSTORM_MODEL };
  }
  if (FAST_GOAL_PATTERN.test(goal)) {
    return { provider: "openai", model: OPENAI_FAST_MODEL };
  }
  // Default: Claude for all code generation and structural work
  return { provider: "anthropic", model: CLAUDE_MODEL };
}

const SYSTEM_PROMPT = `You are a code generation engine. Given a build packet goal and requirements, produce the necessary source files to implement it.

Respond ONLY with a JSON object in this exact shape (no markdown, no prose, no code fences):
{
  "summary": "<one sentence describing what was built>",
  "files": [
    { "path": "<relative file path>", "body": "<full file content>" }
  ]
}

Rules:
- Output valid, complete, runnable code — no placeholders, no TODOs, no stub functions
- Use sensible file paths (e.g. src/components/Foo.tsx, lib/utils.ts)
- Include at least one file per requirement
- Do not include binary files
- Keep files focused and complete`;

function buildUserPrompt(body: ExecuteRequest): string {
  const requirementsList = Array.isArray(body.requirements) && body.requirements.length > 0
    ? body.requirements.map((r, i) => `${i + 1}. ${r}`).join("\n")
    : "No specific requirements listed.";
  const constraintsList = Array.isArray(body.constraints) && body.constraints.length > 0
    ? body.constraints.map((c, i) => `${i + 1}. ${c}`).join("\n")
    : "No specific constraints listed.";
  return `Project ID: ${body.projectId}
Packet ID: ${body.packetId}
Branch: ${body.branchName || "main"}

Goal:
${body.goal || "Implement the described feature"}

Requirements:
${requirementsList}

Constraints:
${constraintsList}

Generate the source files now.`;
}

function parseFilesFromText(rawText: string): { summary?: string; files?: Array<{ path: string; body: string }> } {
  try {
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    return jsonMatch ? JSON.parse(jsonMatch[0]) : {};
  } catch {
    return {};
  }
}

function normalizeFiles(input: unknown): FileChange[] {
  if (!Array.isArray(input)) return [];
  return (input as Array<{ path?: string; body?: string }>)
    .filter((f) => typeof f.path === "string" && typeof f.body === "string" && f.path.trim())
    .map((f) => ({ path: f.path!.trim(), body: f.body! }));
}

async function executeWithClaude(body: ExecuteRequest): Promise<ExecuteResponse> {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const message = await anthropic.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 8192,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: buildUserPrompt(body) }],
  });
  const rawText = message.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");
  const parsed = parseFilesFromText(rawText);
  const changedFiles = normalizeFiles(parsed.files);
  return {
    success: changedFiles.length > 0,
    summary: parsed.summary || `Executed packet ${body.packetId} via Claude`,
    changedFiles,
    logs: [
      `provider=anthropic`,
      `model=${message.model}`,
      `input_tokens=${message.usage.input_tokens}`,
      `output_tokens=${message.usage.output_tokens}`,
      `files_generated=${changedFiles.length}`,
    ],
  };
}

async function executeWithOpenAI(body: ExecuteRequest, model: string): Promise<ExecuteResponse> {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const completion = await openai.chat.completions.create({
    model,
    max_tokens: 8192,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: buildUserPrompt(body) },
    ],
  });
  const rawText = completion.choices[0]?.message?.content || "";
  const parsed = parseFilesFromText(rawText);
  const changedFiles = normalizeFiles(parsed.files);
  return {
    success: changedFiles.length > 0,
    summary: parsed.summary || `Executed packet ${body.packetId} via OpenAI`,
    changedFiles,
    logs: [
      `provider=openai`,
      `model=${model}`,
      `prompt_tokens=${completion.usage?.prompt_tokens ?? 0}`,
      `completion_tokens=${completion.usage?.completion_tokens ?? 0}`,
      `files_generated=${changedFiles.length}`,
    ],
  };
}

// ── Health ──────────────────────────────────────────────────────────────────
app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    executor: "claude-runner",
    models: {
      code: { provider: "anthropic", model: CLAUDE_MODEL },
      brainstorm: { provider: "openai", model: OPENAI_BRAINSTORM_MODEL },
      fast: { provider: "openai", model: OPENAI_FAST_MODEL },
    },
  });
});

// ── Execute ─────────────────────────────────────────────────────────────────
app.post("/execute", async (req, res) => {
  const body = req.body as ExecuteRequest;

  if (!body.projectId || !body.packetId) {
    return res.status(400).json({ error: "Invalid payload: projectId and packetId are required" });
  }

  const routed = routeModel(body.goal || "");

  // Validate required API key for chosen provider
  if (routed.provider === "anthropic" && !process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: "ANTHROPIC_API_KEY not configured in claude-runner" });
  }
  if (routed.provider === "openai" && !process.env.OPENAI_API_KEY) {
    // Fall back to Claude if OpenAI key is missing
    if (!process.env.ANTHROPIC_API_KEY) {
      return res.status(500).json({ error: "No AI provider API keys configured (ANTHROPIC_API_KEY or OPENAI_API_KEY)" });
    }
    console.warn(JSON.stringify({ event: "openai_key_missing_fallback", packetId: body.packetId, goal: body.goal }));
    routed.provider = "anthropic";
    (routed as any).model = CLAUDE_MODEL;
  }

  try {
    const result = routed.provider === "openai"
      ? await executeWithOpenAI(body, routed.model)
      : await executeWithClaude(body);

    return res.json(result);
  } catch (err: any) {
    const message = String(err?.message || err);
    return res.status(500).json({
      success: false,
      summary: `Execution failed: ${message}`,
      changedFiles: [],
      logs: [`provider=${routed.provider}`, `model=${routed.model}`, `error=${message}`],
    });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(JSON.stringify({
    event: "claude_runner_ready",
    port: PORT,
    routing: {
      code: `anthropic/${CLAUDE_MODEL}`,
      brainstorm: `openai/${OPENAI_BRAINSTORM_MODEL}`,
      fast: `openai/${OPENAI_FAST_MODEL}`,
    },
  }));
});
