import { GitOperationResult } from "./operations";

export function isBranchAlreadyCreated(error: string): boolean {
  return error.includes("Reference already exists");
}

export function isPullRequestAlreadyExists(error: string): boolean {
  return error.includes("A pull request already exists") || error.includes("already exists");
}

export function normalizeGitHubError(error: any): string {
  return String(error?.message || error);
}

export function reconcileBranch(result: GitOperationResult | null, error?: string): GitOperationResult {
  if (result && result.status === "succeeded") return result;
  if (error && isBranchAlreadyCreated(error)) {
    return {
      operationId: result?.operationId || "unknown",
      status: "succeeded",
      updatedAt: new Date().toISOString()
    };
  }
  return {
    operationId: result?.operationId || "unknown",
    status: "failed",
    error: error,
    updatedAt: new Date().toISOString()
  };
}

export function reconcilePullRequest(result: GitOperationResult | null, error?: string): GitOperationResult {
  if (result && result.status === "succeeded") return result;
  if (error && isPullRequestAlreadyExists(error)) {
    return {
      operationId: result?.operationId || "unknown",
      status: "succeeded",
      updatedAt: new Date().toISOString()
    };
  }
  return {
    operationId: result?.operationId || "unknown",
    status: "failed",
    error,
    updatedAt: new Date().toISOString()
  };
}
