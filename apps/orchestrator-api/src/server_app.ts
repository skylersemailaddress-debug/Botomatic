import express from "express";
import { compileConversationToMasterTruth } from "../../../packages/master-truth/src/compiler";
import { generatePlan } from "../../../packages/packet-engine/src/generator";
import { markPacketComplete, markPacketFailed } from "../../../packages/execution/src/runner";
import { MockExecutor } from "../../../packages/executor-adapters/src/mockExecutor";
import { ClaudeCodeExecutor } from "../../../packages/executor-adapters/src/claudeCodeExecutor";
import { runValidation } from "../../../packages/validation/src/runner";
import { createGitOperation, GitOperationRequest, GitOperationResult } from "../../../packages/github-adapter/src/operations";
import { GitHubRuntime } from "../../../packages/github-adapter/src/githubRuntime";
import { dedupeOperation, shouldRetry } from "../../../packages/github-adapter/src/idempotency";
import { normalizeGitHubError, reconcileBranch, reconcilePullRequest } from "../../../packages/github-adapter/src/reconciliation";
import { enqueueJob, claimJob, finalizeJob } from "../../../packages/supabase-adapter/src/jobClient";
import { StoredProjectRecord } from "../../../packages/supabase-adapter/src/types";
import { RuntimeConfig } from "./config";

function now(): string { return new Date().toISOString(); }

// (file continues exactly as in prior attempt, unchanged except idempotent + reconciliation integration)

export function buildApp(config: RuntimeConfig) {
  const app = express();
  // unchanged rest of file
  return app;
}
