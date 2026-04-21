import { ExecutorAdapter, ExecutorContext, ExecutorResult } from "./types";

export const MockExecutor: ExecutorAdapter = {
  name: "mock",

  async execute(context: ExecutorContext): Promise<ExecutorResult> {
    return {
      success: true,
      summary: `Executed packet ${context.packetId}`,
      changedFiles: ["/example/file.ts"],
      logs: [`Mock execution for ${context.goal}`]
    };
  }
};
