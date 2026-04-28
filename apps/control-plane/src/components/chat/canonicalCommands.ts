import { parseCommand, type ParsedCommand } from "./intentRouting";

export const CANONICAL_COMMAND_BY_PARSED: Record<Exclude<ParsedCommand, null>, string> = {
  "continue-build": "continue current generated app build",
  validate: "run validate all and summarize proof",
  "explain-blocker": "explain blocker and propose safe default",
  "explain-state": "show current system state and next best action",
  "approve-plan": "approve current generated app build contract",
  "bind-build-contract": "compile + bind build contract",
  "show-proof": "show latest proof and launch readiness",
  "fix-failure": "inspect failed milestone and recommend repair",
  "inspect-failure": "inspect failed milestone and recommend repair",
  "resolve-blocker": "explain blocker and propose safe default",
  "next-best-action": "show current system state and next best action",
  "configure-keys": "show missing secrets and recommended setup",
  "prepare-deployment": "prepare deployment readiness, no live deployment",
  "launch-capsule": "generate launch capsule from latest generated app artifacts",
  "generate-plan": "generate execution plan from uploaded build contract",
  "pause-run": "pause current generated app build",
};

export function resolveCanonicalCommandInput(input: string): {
  parsed: ParsedCommand;
  command: string;
} {
  const parsed = parseCommand(input);
  return {
    parsed,
    command: parsed ? CANONICAL_COMMAND_BY_PARSED[parsed] : input,
  };
}
