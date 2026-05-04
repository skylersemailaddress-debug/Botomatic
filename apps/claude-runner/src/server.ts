import express from "express";
import { executePacket } from "./executor.js";
import { ExecuteRequest, ExecuteResponse } from "./types.js";

const app = express();
app.use(express.json({ limit: "4mb" }));

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "claude-runner" });
});

app.post("/execute", async (req, res) => {
  const body = req.body as ExecuteRequest;

  if (!body.projectId || !body.packetId || !body.goal) {
    return res.status(400).json({ error: "Missing required fields: projectId, packetId, goal" });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(503).json({ error: "ANTHROPIC_API_KEY not configured" });
  }

  try {
    const result: ExecuteResponse = await executePacket({
      projectId: body.projectId,
      packetId: body.packetId,
      branchName: body.branchName ?? "main",
      goal: body.goal,
      requirements: Array.isArray(body.requirements) ? body.requirements : [],
      constraints: Array.isArray(body.constraints) ? body.constraints : [],
    });
    return res.json(result);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ success: false, error: msg, changedFiles: [], logs: [msg] });
  }
});

const PORT = parseInt(process.env.PORT ?? "4000", 10);
app.listen(PORT, "127.0.0.1", () => {
  const anthropicKey = process.env.ANTHROPIC_API_KEY ? "set" : "MISSING";
  const openaiKey    = process.env.OPENAI_API_KEY    ? "set" : "missing (brainstorm/utility will fallback to Claude)";
  const geminiKey    = (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY) ? "set" : "missing (fast tier will fallback to Claude)";
  console.log(JSON.stringify({
    event: "claude_runner_ready",
    port: PORT,
    anthropicKey,
    openaiKey,
    geminiKey,
    tiers: {
      flagship:   `${process.env.NEXUS_MODEL_FLAGSHIP_PROVIDER   ?? "anthropic"}/${process.env.NEXUS_MODEL_FLAGSHIP   ?? "claude-opus-4-7"}  (council escalation target)`,
      general:    `${process.env.NEXUS_MODEL_GENERAL_PROVIDER    ?? "anthropic"}/${process.env.NEXUS_MODEL_GENERAL    ?? "claude-sonnet-4-6"} (code generation, most waves)`,
      brainstorm: `${process.env.NEXUS_MODEL_BRAINSTORM_PROVIDER ?? "openai"}/${process.env.NEXUS_MODEL_BRAINSTORM     ?? "gpt-4o"}           (spec analysis, architecture, AI features)`,
      fast:       `${process.env.NEXUS_MODEL_FAST_PROVIDER       ?? "google"}/${process.env.NEXUS_MODEL_FAST           ?? "gemini-2.0-flash"} (validation, deployment)`,
      utility:    `${process.env.NEXUS_MODEL_UTILITY_PROVIDER    ?? "openai"}/${process.env.NEXUS_MODEL_UTILITY         ?? "gpt-4o-mini"}      (scaffolding, critic)`,
    },
  }));
});
