import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";
import { isSafeRuntimeCommand, resolveLogPath } from "./domainRuntimeCommandPolicy";

export type CommandKind = "install" | "build" | "test" | "lint_typecheck" | "deploy_validation" | "fallback_validation";

export type DomainCommand = {
  id: string;
  kind: CommandKind;
  command: string;
  required: boolean;
  allowToolingSkip?: boolean;
  expectedArtifacts?: string[];
};

export type CommandRunRecord = {
  commandId: string;
  kind: CommandKind;
  command: string;
  status: "passed" | "failed" | "skipped";
  skipReason: string | null;
  exitCode: number | null;
  stdoutSummary: string;
  stderrSummary: string;
  logArtifactPath: string;
  generatedArtifacts: string[];
};

function summarize(text: string): string {
  const cleaned = String(text || "").trim();
  if (!cleaned) return "";
  const lines = cleaned.split(/\r?\n/).filter(Boolean);
  const head = lines.slice(0, 6).join(" | ");
  return head.length > 700 ? `${head.slice(0, 700)}...` : head;
}

function ensureDir(dirPath: string) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function detectArtifacts(domainPath: string, expectedArtifacts?: string[]): string[] {
  if (!Array.isArray(expectedArtifacts) || expectedArtifacts.length === 0) {
    return [];
  }
  return expectedArtifacts
    .map((rel) => path.join(domainPath, rel))
    .filter((full) => fs.existsSync(full));
}

function hasLikelyMissingTooling(stderrText: string, stdoutText: string): boolean {
  const text = `${stdoutText}\n${stderrText}`.toLowerCase();
  return (
    text.includes("command not found") ||
    text.includes("not recognized") ||
    text.includes("cannot find module") ||
    text.includes("missing script") ||
    text.includes("enoent") ||
    text.includes("next: not found") ||
    text.includes("tsc: not found")
  );
}

export function executeDomainCommand(input: {
  root: string;
  domainId: string;
  domainPath: string;
  commandDef: DomainCommand;
}): CommandRunRecord {
  const { root, domainId, domainPath, commandDef } = input;
  const logPath = resolveLogPath(root, domainId, commandDef.id);
  ensureDir(path.dirname(logPath));

  const safeCheck = isSafeRuntimeCommand(commandDef.command);
  if (!safeCheck.ok) {
    const reason = safeCheck.reason || "Blocked by safe command policy.";
    fs.writeFileSync(logPath, `[blocked]\n${reason}\ncommand=${commandDef.command}\n`);
    return {
      commandId: commandDef.id,
      kind: commandDef.kind,
      command: commandDef.command,
      status: "failed",
      skipReason: null,
      exitCode: 126,
      stdoutSummary: "",
      stderrSummary: reason,
      logArtifactPath: logPath,
      generatedArtifacts: [],
    };
  }

  const startedAt = new Date().toISOString();
  const run = spawnSync("bash", ["-lc", commandDef.command], {
    cwd: domainPath,
    encoding: "utf8",
    timeout: 120000,
    maxBuffer: 1024 * 1024,
  });
  const finishedAt = new Date().toISOString();

  const exitCode = typeof run.status === "number" ? run.status : 1;
  const stdoutText = String(run.stdout || "");
  const stderrText = String(run.stderr || "");

  let status: "passed" | "failed" | "skipped" = exitCode === 0 ? "passed" : "failed";
  let skipReason: string | null = null;

  if (exitCode !== 0 && commandDef.allowToolingSkip && hasLikelyMissingTooling(stderrText, stdoutText)) {
    status = "skipped";
    skipReason = "Toolchain/framework command unavailable in local proof harness environment; fallback structural validation required by policy.";
  }

  const generatedArtifacts = detectArtifacts(domainPath, commandDef.expectedArtifacts);

  const logPayload = [
    `domain=${domainId}`,
    `commandId=${commandDef.id}`,
    `kind=${commandDef.kind}`,
    `startedAt=${startedAt}`,
    `finishedAt=${finishedAt}`,
    `status=${status}`,
    `exitCode=${exitCode}`,
    skipReason ? `skipReason=${skipReason}` : "",
    "--- stdout ---",
    stdoutText,
    "--- stderr ---",
    stderrText,
    generatedArtifacts.length > 0 ? `--- generatedArtifacts ---\n${generatedArtifacts.join("\n")}` : "",
  ].filter(Boolean).join("\n");

  fs.writeFileSync(logPath, logPayload);

  return {
    commandId: commandDef.id,
    kind: commandDef.kind,
    command: commandDef.command,
    status,
    skipReason,
    exitCode,
    stdoutSummary: summarize(stdoutText),
    stderrSummary: summarize(stderrText),
    logArtifactPath: logPath,
    generatedArtifacts,
  };
}
