import express from "express";
import { compileConversationToMasterTruth } from "../../../packages/master-truth/src/compiler";
import { generatePlan } from "../../../packages/packet-engine/src/generator";
import { advanceProject, markPacketComplete, markPacketFailed } from "../../../packages/execution/src/runner";
import { MockExecutor } from "../../../packages/executor-adapters/src/mockExecutor";
import { ClaudeCodeExecutor } from "../../../packages/executor-adapters/src/claudeCodeExecutor";
import { runValidation } from "../../../packages/validation/src/runner";
import { createGitOperation } from "../../../packages/github-adapter/src/operations";
import { GitHubRuntime } from "../../../packages/github-adapter/src/githubRuntime";
import { InMemoryProjectRepository } from "../../../packages/supabase-adapter/src/memoryRepo";
import { DurableProjectRepository } from "../../../packages/supabase-adapter/src/durableRepo";
import { StoredProjectRecord, ProjectRepository } from "../../../packages/supabase-adapter/src/types";

const app = express();
app.use(express.json());

// CORS middleware (safe insert)
app.use((req, res, next) => {
  const allowedOrigins = new Set([
    "http://127.0.0.1:3000",
    "http://localhost:3000",
  ]);

  const origin = req.header("origin");

  if (origin && allowedOrigins.has(origin)) {
    res.header("Access-Control-Allow-Origin", origin);
    res.header("Vary", "Origin");
  }

  res.header("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
  res.header("Access-Control-Allow-Headers", "Authorization,Content-Type,x-actor-id,x-user-email");

  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }

  return next();
});

// --- original code continues unchanged ---

type RepositoryContext = {
  repo: ProjectRepository;
  mode: "memory" | "durable";
  implementation: string;
};

// (rest of original file unchanged)
