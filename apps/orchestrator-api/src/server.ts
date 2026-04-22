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
import { StoredProjectRecord } from "../../../packages/supabase-adapter/src/types";
import {
  dispatchExecuteNextPacket,
  dispatchProcessGitOperation,
} from "../../../packages/trigger-adapter/src/liveTrigger";

const app = express();
app.use(express.json());

const repo = new InMemoryProjectRepository();

function now(): string {
  return new Date().toISOString();
}

function getExecutor() {
  if (process.env.EXECUTOR === "claude") {
    return new ClaudeCodeExecutor({
      baseUrl: process.env.CLAUDE_EXECUTOR_URL!,
      apiKey: process.env.CLAUDE_EXECUTOR_KEY,
    });
  }
  return MockExecutor;
}

function getGitHub() {
  return new GitHubRuntime({
    token: process.env.GITHUB_TOKEN!,
    owner: "skylersemailaddress-debug",
    repo: "Botomatic",
  });
}

app.post("/api/projects/:projectId/dispatch/execute-next", async (req, res) => {
  const project = await repo.getProject(req.params.projectId);
  if (!project || !project.plan) return res.status(404).json({ error: "No plan" });

  let updatedState = advanceProject({
    projectId: project.projectId,
    status: project.status as any,
    packets: (project.plan as any).packets,
    runs: project.runs as any,
  });

  let updated: StoredProjectRecord = {
    ...project,
    status: updatedState.status,
    plan: { ...(project.plan as any), packets: updatedState.packets },
    runs: updatedState.runs,
    updatedAt: now(),
  };

  const executingPacket = (updated.plan as any).packets.find((p: any) => p.status === "executing");

  if (executingPacket) {
    try {
      const executor = getExecutor();
      const result = await executor.execute({
        projectId: updated.projectId,
        packetId: executingPacket.packetId,
        branchName: executingPacket.branchName,
        goal: executingPacket.goal,
        requirements: executingPacket.requirements,
        constraints: executingPacket.constraints,
      });

      if (result.success) {
        const gh = getGitHub();
        const baseSha = await gh.getDefaultBranchSha();
        await gh.createBranch(executingPacket.branchName, baseSha);

        await gh.commitFiles(
          executingPacket.branchName,
          `Packet ${executingPacket.packetId}`,
          result.changedFiles.map((f: any) => ({
            path: f.path,
            content: f.body,
          }))
        );

        const pr = await gh.createPullRequest(
          `Packet ${executingPacket.packetId}`,
          executingPacket.branchName
        );

        updated.gitResults = {
          ...(updated.gitResults || {}),
          [executingPacket.packetId]: pr,
        };

        const validation = runValidation(updated.projectId, executingPacket.packetId);
        updated.validations = {
          ...(updated.validations || {}),
          [executingPacket.packetId]: validation,
        };

        updatedState = markPacketComplete(updatedState, executingPacket.packetId);
      } else {
        updatedState = markPacketFailed(updatedState, executingPacket.packetId);
      }
    } catch (error) {
      updatedState = markPacketFailed(updatedState, executingPacket.packetId);
    }

    updated = {
      ...updated,
      status: updatedState.status,
      plan: { ...(updated.plan as any), packets: updatedState.packets },
      runs: updatedState.runs,
      updatedAt: now(),
    };
  }

  await repo.upsertProject(updated);

  return res.json({
    projectId: updated.projectId,
    status: updated.status,
    gitResults: updated.gitResults,
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`API running on ${PORT}`));
