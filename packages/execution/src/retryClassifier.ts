export type RetrySafety = "safe" | "unsafe";

export function classifyRetrySafety(operation: string): RetrySafety {
  if (operation.includes("validation") || operation.includes("compile") || operation.includes("analysis")) {
    return "safe";
  }

  if (operation.includes("commit") || operation.includes("pull_request") || operation.includes("branch")) {
    return "unsafe";
  }

  return "safe";
}

export function canRetryOperation(operation: string): boolean {
  return classifyRetrySafety(operation) === "safe";
}
