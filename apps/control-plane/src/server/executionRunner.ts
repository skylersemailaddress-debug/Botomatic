import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
import fs from "node:fs";
import { AllowedJobType, StoredJob, appendLog, checksum, redactLine } from "./executionStore";

const execFileAsync = promisify(execFile);

function discoverRepoRoot(start: string): string {
  let current = path.resolve(start);
  while (true) {
    if (fs.existsSync(path.join(current, "package.json"))) return current;
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }
  return path.resolve(start);
}

const repoRoot = discoverRepoRoot(process.cwd());

export const ALLOWLISTED_JOB_TYPES: AllowedJobType[] = ["test", "build", "file_diff", "lint", "typecheck"];

function hasScript(name: string): boolean {
  try { const pkg = JSON.parse(fs.readFileSync(path.join(repoRoot, "package.json"), "utf8")); return Boolean(pkg?.scripts?.[name]); } catch { return false; }
}

async function runCommand(command: string, args: string[]): Promise<{ exitCode: number; lines: string[] }> {
  try {
    const { stdout, stderr } = await execFileAsync(command, args, { cwd: repoRoot, timeout: 120000, maxBuffer: 1024 * 1024 });
    const raw = `${stdout || ""}\n${stderr || ""}`.trim();
    return { exitCode: 0, lines: raw ? raw.split("\n").map((l) => redactLine(l)).slice(-120) : ["Command completed without output"] };
  } catch (err: any) {
    const raw = `${err?.stdout || ""}\n${err?.stderr || ""}\n${err?.message || ""}`.trim();
    return { exitCode: Number(err?.code ?? 1), lines: raw ? raw.split("\n").map((l) => redactLine(l)).slice(-120) : ["Command failed"] };
  }
}

export async function executeAllowlistedJob(job: StoredJob): Promise<StoredJob> {
  const startedAt = new Date().toISOString();
  let result = { exitCode: 1, lines: ["Blocked"] };
  let operation = job.operation;
  let status: StoredJob["status"] = "blocked";
  let error: string | undefined;

  if (job.type === "file_diff") {
    operation = "git diff --shortstat -- .";
    result = await runCommand("git", ["diff", "--shortstat", "--", "."]);
    status = result.exitCode === 0 ? "succeeded" : "failed";
  } else if (job.type === "build") {
    operation = "npm run -s build";
    result = await runCommand("npm", ["run", "-s", "build"]);
    status = result.exitCode === 0 ? "succeeded" : "failed";
  } else if (job.type === "test") {
    const script = hasScript("test:wave-036") ? ["run", "-s", "test:wave-036"] : hasScript("test") ? ["run", "-s", "test"] : null;
    if (!script) { status = "blocked"; error = "No safe test script available"; }
    else { operation = `npm ${script.join(" ")}`; result = await runCommand("npm", script); status = result.exitCode === 0 ? "succeeded" : "failed"; }
  } else if (job.type === "lint") {
    if (!hasScript("lint")) { status = "blocked"; error = "lint script is unavailable"; }
    else { operation = "npm run -s lint"; result = await runCommand("npm", ["run", "-s", "lint"]); status = result.exitCode === 0 ? "succeeded" : "failed"; }
  } else if (job.type === "typecheck") {
    if (!hasScript("typecheck")) { status = "blocked"; error = "typecheck script is unavailable"; }
    else { operation = "npm run -s typecheck"; result = await runCommand("npm", ["run", "-s", "typecheck"]); status = result.exitCode === 0 ? "succeeded" : "failed"; }
  }

  const completedAt = new Date().toISOString();
  const logLines = result.lines.map((line) => `[${completedAt}] ${line}`).slice(-120);
  const summary = status === "succeeded" ? `${job.type} completed` : `${job.type} ${status}`;
  return { ...job, operation, startedAt, completedAt, status, error, exitCode: result.exitCode, resultSummary: summary, logLines, redactionStatus: "redacted", checksum: checksum({ status, exitCode: result.exitCode, logLines: logLines.slice(-10) }) };
}

export function routeStatusFromJobs(jobs: StoredJob[]): StoredJob["status"] {
  if (jobs.some((job) => job.status === "failed")) return "failed";
  if (jobs.some((job) => job.status === "blocked")) return "blocked";
  if (jobs.every((job) => job.status === "succeeded")) return "succeeded";
  return "running";
}

export function appendRunLogs(existing: string[], job: StoredJob): string[] {
  let next = appendLog(existing, `job ${job.id} (${job.type}) -> ${job.status} via ${job.operation}`);
  for (const line of job.logLines.slice(-20)) next = appendLog(next, line);
  return next;
}
