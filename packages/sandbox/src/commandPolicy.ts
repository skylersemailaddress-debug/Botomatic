import { SandboxPolicy } from "./policy";

export function isCommandAllowed(command: string, policy: SandboxPolicy): boolean {
  const lower = command.toLowerCase();
  return !policy.blockedCommands.some((blocked) => lower.includes(blocked.toLowerCase()));
}
