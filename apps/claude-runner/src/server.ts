import express from "express";
import { ExecuteRequest, ExecuteResponse, FileChange } from "./types";
import { classifyTask, executeWithRouter, getActiveModels } from "./router";

const app = express();
app.use(express.json());

// ── Prompt templates ─────────────────────────────────────────────────────────

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
  const req = Array.isArray(body.requirements) && body.requirements.length > 0
    ? body.requirements.map((r, i) => `${i + 1}. ${r}`).join("\n")
    : "No specific requirements listed.";
  const con = Array.isArray(body.constraints) && body.constraints.length > 0
    ? body.constraints.map((c, i) => `${i + 1}. ${c}`).join("\n")
    : "No specific constraints listed.";
  return `Project ID: ${body.projectId}
Packet ID: ${body.packetId}
Branch: ${body.branchName || "main"}

Goal:
${body.goal || "Implement the described feature"}

Requirements:
${req}

Constraints:
${con}

Generate the source files now.`;
}

// ── Output parsing ───────────────────────────────────────────────────────────

function parseFiles(rawText: string): { summary?: string; files?: Array<{ path: string; body: string }> } {
  try {
    const m = rawText.match(/\{[\s\S]*\}/);
    return m ? JSON.parse(m[0]) : {};
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

// ── Routes ───────────────────────────────────────────────────────────────────

app.get("/health", (_req, res) => {
  const active = getActiveModels();
  const configured = {
    anthropic: Boolean(process.env.ANTHROPIC_API_KEY),
    openai: Boolean(process.env.OPENAI_API_KEY),
    gemini: Boolean(process.env.GOOGLE_AI_API_KEY),
    groq: Boolean(process.env.GROQ_API_KEY),
    deepseek: Boolean(process.env.DEEPSEEK_API_KEY),
  };
  res.json({ status: "ok", executor: "claude-runner", providers: configured, routing: active });
});

app.post("/execute", async (req, res) => {
  const body = req.body as ExecuteRequest;

  if (!body.projectId || !body.packetId) {
    return res.status(400).json({ error: "Invalid payload: projectId and packetId are required" });
  }

  const task = classifyTask(body.goal || "");
  const userPrompt = buildUserPrompt(body);

  let result: Awaited<ReturnType<typeof executeWithRouter>>;
  try {
    result = await executeWithRouter(task, SYSTEM_PROMPT, userPrompt);
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      summary: `All providers failed: ${String(err?.message || err)}`,
      changedFiles: [],
      logs: [`task=${task}`, `error=${String(err?.message || err)}`],
    });
  }

  const parsed = parseFiles(result.text);
  const changedFiles = normalizeFiles(parsed.files);

  const response: ExecuteResponse = {
    success: changedFiles.length > 0,
    summary: parsed.summary || `Executed packet ${body.packetId} via ${result.providerName}`,
    changedFiles,
    logs: [
      `task=${task}`,
      `provider=${result.providerName}`,
      `model=${result.model}`,
      ...result.tokenLog,
      `files_generated=${changedFiles.length}`,
      ...result.attempts,
    ],
  };

  return res.json(response);
});

// ── Start ─────────────────────────────────────────────────────────────────────

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  const active = getActiveModels();
  console.log(JSON.stringify({
    event: "claude_runner_ready",
    port: PORT,
    providers: {
      anthropic: Boolean(process.env.ANTHROPIC_API_KEY),
      openai: Boolean(process.env.OPENAI_API_KEY),
      gemini: Boolean(process.env.GOOGLE_AI_API_KEY),
      groq: Boolean(process.env.GROQ_API_KEY),
      deepseek: Boolean(process.env.DEEPSEEK_API_KEY),
    },
    routing: active,
  }));
});
