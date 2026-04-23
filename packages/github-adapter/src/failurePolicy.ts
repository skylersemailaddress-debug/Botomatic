export type GitFailureClass =
  | "branch_exists"
  | "pr_exists"
  | "auth"
  | "not_found"
  | "validation"
  | "unknown";

export function classifyGitFailure(message: string): GitFailureClass {
  if (message.includes("Reference already exists")) return "branch_exists";
  if (message.includes("A pull request already exists") || message.includes("already exists")) return "pr_exists";
  if (message.includes("401") || message.toLowerCase().includes("bad credentials")) return "auth";
  if (message.includes("404")) return "not_found";
  if (message.toLowerCase().includes("validation")) return "validation";
  return "unknown";
}

export function isRecoverableGitFailure(kind: GitFailureClass): boolean {
  return kind === "branch_exists" || kind === "pr_exists";
}
