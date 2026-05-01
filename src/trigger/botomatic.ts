import { logger, task } from "@trigger.dev/sdk/v3";

type ExecuteNextPacketPayload = {
  projectId: string;
  apiBaseUrl: string;
};

type GitOperationPayload = {
  projectId: string;
  operationId: string;
  apiBaseUrl: string;
};

async function postJson(url: string, body: unknown) {
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Request failed ${res.status}: ${text}`);
  }

  return res.json();
}

export const executeNextPacketTask = task({
  id: "execute-next-packet",
  maxDuration: 600,
  run: async (payload: ExecuteNextPacketPayload) => {
    logger.log("Executing next packet", payload);

    const result = await postJson(
      `${payload.apiBaseUrl}/api/projects/${payload.projectId}/dispatch/execute-next`,
      {}
    );

    logger.log("Execute-next result", { result });
    return result;
  },
});

export const processGitOperationTask = task({
  id: "process-git-operation",
  maxDuration: 600,
  run: async (payload: GitOperationPayload) => {
    logger.log("Processing git operation", payload);

    await postJson(
      `${payload.apiBaseUrl}/api/projects/${payload.projectId}/dispatch/process-git-operation`,
      {}
    );

    const failClosedResult = {
      operationId: payload.operationId,
      status: "failed",
      error: "Trigger task is not configured to execute real git operations in this environment.",
    };

    const result = await postJson(
      `${payload.apiBaseUrl}/api/projects/${payload.projectId}/git/result`,
      failClosedResult
    );

    logger.log("Git result posted", { result });
    return result;
  },
});
