export type TriggerDispatchResult = {
  triggerTaskId: string;
  payload: Record<string, unknown>;
};

export function dispatchExecuteNextPacket(input: {
  projectId: string;
  apiBaseUrl: string;
}): TriggerDispatchResult {
  return {
    triggerTaskId: "execute-next-packet",
    payload: {
      projectId: input.projectId,
      apiBaseUrl: input.apiBaseUrl,
    },
  };
}

export function dispatchProcessGitOperation(input: {
  projectId: string;
  operationId: string;
  apiBaseUrl: string;
}): TriggerDispatchResult {
  return {
    triggerTaskId: "process-git-operation",
    payload: {
      projectId: input.projectId,
      operationId: input.operationId,
      apiBaseUrl: input.apiBaseUrl,
    },
  };
}
