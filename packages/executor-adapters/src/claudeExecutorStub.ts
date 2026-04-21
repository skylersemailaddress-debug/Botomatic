import { ExecutorAdapter, ExecutorContext, ExecutorResult } from "./types";

export const ClaudeExecutorStub: ExecutorAdapter = {
  name: "claude_stub",

  async execute(context: ExecutorContext): Promise<ExecutorResult> {
    return {
      success: false,
      summary: "Claude executor not wired yet",
      changedFiles: [],
      logs: [
        `Pending real Claude integration for packet ${context.packetId}`
      ]
    };
  }
};
