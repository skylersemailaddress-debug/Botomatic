export type UIDataStateApiWiringRisk = "low" | "medium" | "high";

export type UIDataBinding = {
  bindingId: string;
  bindingName?: string;
  normalizedBindingName?: string;
  nodeId: string;
  propertyPath: string;
  expression: string;
};

export type UIStateBinding = {
  stateKey: string;
  initialValue: unknown;
  scope: "local" | "page" | "app";
  nodeId?: string;
  propertyPath?: string;
};

export type UIStateAction = {
  actionId: string;
  actionType: "set" | "toggle" | "increment" | "decrement" | "reset" | "append" | "remove";
  stateKey: string;
  payload?: unknown;
  triggerNodeId?: string;
};

export type UIApiEndpoint = {
  endpointId: string;
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  url: string;
  headers?: Record<string, string>;
  externalAllowed?: boolean;
  devAllowed?: boolean;
};

export type UIApiRequestBinding = {
  requestBindingId: string;
  endpointId: string;
  triggerNodeId?: string;
  params?: unknown;
  body?: unknown;
  responseMappings: Array<{ targetNodeId?: string; targetStateKey?: string; propertyPath: string; expression: string }>;
};

export type UIDataStateApiWiringInput = {
  bindings?: UIDataBinding[];
  stateBindings?: UIStateBinding[];
  stateActions?: UIStateAction[];
  apiEndpoints?: UIApiEndpoint[];
  apiRequestBindings?: UIApiRequestBinding[];
};

export type UIDataStateApiWiringIssue = { code: string; message: string; path: string };

export type UIDataStateApiWiringPlan = {
  wiringPlanId: string;
  bindings: UIDataBinding[];
  stateBindings: UIStateBinding[];
  stateActions: UIStateAction[];
  apiEndpoints: UIApiEndpoint[];
  apiRequestBindings: UIApiRequestBinding[];
  affectedNodeIds: string[];
  affectedFilePaths: string[];
  orderedOperations: Array<{ order: 1 | 2 | 3 | 4 | 5; label: string }>;
  riskLevel: UIDataStateApiWiringRisk;
  requiresManualReview: boolean;
  blockedReasons: string[];
  sourceIdentityIds?: string[];
  multiFilePlanId?: string;
  fullProjectPlanId?: string;
  caveat: "Data/state/API wiring planning is deterministic dry-run planning and does not execute requests, write files, deploy, or prove runtime correctness.";
};

export type UIDataStateApiWiringResult = {
  normalizedInput: Required<UIDataStateApiWiringInput>;
  issues: UIDataStateApiWiringIssue[];
};

export const UI_DATA_STATE_API_WIRING_CAVEAT = "Data/state/API wiring planning is deterministic dry-run planning and does not execute requests, write files, deploy, or prove runtime correctness." as const;
