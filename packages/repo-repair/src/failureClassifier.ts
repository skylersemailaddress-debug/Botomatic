export type RepoFailureClass = "build" | "test" | "security" | "placeholder" | "deployment" | "unknown";

export function classifyRepoFailure(message: string): RepoFailureClass {
  const lower = message.toLowerCase();
  if (lower.includes("build")) return "build";
  if (lower.includes("test")) return "test";
  if (lower.includes("security") || lower.includes("auth")) return "security";
  if (lower.includes("placeholder") || lower.includes("todo")) return "placeholder";
  if (lower.includes("deploy")) return "deployment";
  return "unknown";
}
