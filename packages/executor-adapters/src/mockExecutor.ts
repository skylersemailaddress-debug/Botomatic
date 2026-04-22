import { ExecutorAdapter, ExecutorContext, ExecutorResult } from "./types";

export const MockExecutor: ExecutorAdapter = {
  name: "mock",

  async execute(context: ExecutorContext): Promise<ExecutorResult> {
    return {
      success: true,
      summary: `Executed packet ${context.packetId}`,
      changedFiles: [
        {
          path: "example/file.ts",
          body: `export const packetId = \"${context.packetId}\";\n`,
        },
      ],
      logs: [`Mock execution for ${context.goal}`],
    };
  },
};
