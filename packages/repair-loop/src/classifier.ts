export type FailureClass =
  | "build"
  | "test"
  | "lint"
  | "typecheck"
  | "runtime"
  | "validator"
  | "unknown";

export function classifyFailure(message: string): FailureClass {
  const lower = message.toLowerCase();
  if (lower.includes("build")) return "build";
  if (lower.includes("test")) return "test";
  if (lower.includes("lint")) return "lint";
  if (lower.includes("type")) return "typecheck";
  if (lower.includes("validator")) return "validator";
  if (lower.includes("runtime")) return "runtime";
  return "unknown";
}
