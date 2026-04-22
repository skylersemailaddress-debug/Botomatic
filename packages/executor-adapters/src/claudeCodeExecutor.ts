import { ExecutorAdapter, ExecutorContext, ExecutorResult } from "./types";

export type ClaudeCodeExecutorOptions = {
  baseUrl: string;
  apiKey?: string;
  timeoutMs?: number;
};

async function postJson(url: string, body: unknown, apiKey?: string, timeoutMs = 300000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Claude Code executor request failed ${res.status}: ${text}`);
    }

    return res.json();
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Real executor boundary for an external Claude Code worker service.
 *
 * Expected worker contract:
 * POST {baseUrl}/execute
 * {
 *   projectId,
 *   packetId,
 *   branchName,
 *   goal,
 *   requirements,
 *   constraints
 * }
 *
 * Response:
 * {
 *   success: boolean,
 *   summary: string,
 *   changedFiles: string[],
 *   logs?: string[]
 * }
 */
export class ClaudeCodeExecutor implements ExecutorAdapter {
  public readonly name = "claude_code";

  constructor(private readonly options: ClaudeCodeExecutorOptions) {}

  async execute(context: ExecutorContext): Promise<ExecutorResult> {
    const data = await postJson(
      `${this.options.baseUrl.replace(/\/$/, "")}/execute`,
      {
        projectId: context.projectId,
        packetId: context.packetId,
        branchName: context.branchName,
        goal: context.goal,
        requirements: context.requirements,
        constraints: context.constraints,
      },
      this.options.apiKey,
      this.options.timeoutMs
    );

    return {
      success: Boolean(data.success),
      summary: String(data.summary || "Claude Code execution completed"),
      changedFiles: Array.isArray(data.changedFiles) ? data.changedFiles : [],
      logs: Array.isArray(data.logs) ? data.logs : [],
    };
  }
}
