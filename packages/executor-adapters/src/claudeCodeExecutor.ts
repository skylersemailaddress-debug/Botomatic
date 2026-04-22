import { ExecutorAdapter, ExecutorContext, ExecutorResult } from "./types";

export type ClaudeCodeExecutorOptions = {
  baseUrl: string;
  apiKey?: string;
  timeoutMs?: number;
};

async function postJsonSafe(url: string, body: unknown, apiKey?: string, timeoutMs = 300000) {
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

    const text = await res.text();
    let data: any = null;

    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = { raw: text };
    }

    return {
      ok: res.ok,
      status: res.status,
      data,
      rawText: text,
    };
  } catch (error: any) {
    return {
      ok: false,
      status: 0,
      data: null,
      rawText: String(error?.message || error),
    };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Real executor boundary for an external Claude Code worker service.
 * Non-throwing by design: all response normalization happens here so the
 * orchestrator can make deterministic retry/repair decisions with logs.
 */
export class ClaudeCodeExecutor implements ExecutorAdapter {
  public readonly name = "claude_code";

  constructor(private readonly options: ClaudeCodeExecutorOptions) {}

  async execute(context: ExecutorContext): Promise<ExecutorResult> {
    const response = await postJsonSafe(
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

    const data = response.data || {};
    const logs: string[] = [];

    logs.push(`claude_executor_http_status=${response.status}`);

    if (response.rawText) {
      logs.push(`claude_executor_raw=${response.rawText}`);
    }

    if (Array.isArray(data.logs)) {
      logs.push(...data.logs.map((v: unknown) => String(v)));
    }

    const success = response.ok && Boolean(data.success);

    return {
      success,
      summary: String(
        data.summary ||
          (success
            ? "Claude Code execution completed"
            : "Claude Code execution failed")
      ),
      changedFiles: Array.isArray(data.changedFiles)
        ? data.changedFiles.map((v: unknown) => String(v))
        : [],
      logs,
    };
  }
}
