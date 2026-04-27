import path from "path";

const SAFE_PREFIXES = [
  "node ",
  "npm run ",
  "npm -s run ",
  "npm run -s ",
  "npm --version",
  "npm -v",
  "test -f ",
  "test -d ",
  "ls ",
  "cat ",
  "echo ",
  "true",
];

const FORBIDDEN_PATTERNS = [
  /\brm\s+-rf\b/i,
  /\bsudo\b/i,
  /\bcurl\b/i,
  /\bwget\b/i,
  /\bgit\s+reset\s+--hard\b/i,
  /\bnpm\s+publish\b/i,
  /\bdocker\b/i,
  /\bkubectl\b/i,
  /\bscp\b/i,
  /\brsync\b/i,
  /\bssh\b/i,
];

export type SafePolicyCheck = {
  ok: boolean;
  reason?: string;
};

export function isSafeRuntimeCommand(command: string): SafePolicyCheck {
  const trimmed = command.trim();
  if (!trimmed) {
    return { ok: false, reason: "Command is empty." };
  }

  const lower = trimmed.toLowerCase();
  const hasSafePrefix = SAFE_PREFIXES.some((prefix) => lower.startsWith(prefix));
  if (!hasSafePrefix) {
    return { ok: false, reason: `Command is not in safe prefix allowlist: ${trimmed}` };
  }

  for (const pattern of FORBIDDEN_PATTERNS) {
    if (pattern.test(trimmed)) {
      return { ok: false, reason: `Command matched forbidden pattern: ${pattern}` };
    }
  }

  return { ok: true };
}

export function normalizeLogFileName(domainId: string, commandId: string): string {
  return `${domainId}__${commandId}`.replace(/[^a-zA-Z0-9_.-]/g, "_") + ".log";
}

export function resolveLogPath(root: string, domainId: string, commandId: string): string {
  return path.join(root, "release-evidence", "runtime", "logs", normalizeLogFileName(domainId, commandId));
}
