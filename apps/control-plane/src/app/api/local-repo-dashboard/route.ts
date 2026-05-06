import { NextRequest, NextResponse } from "next/server";
import { execFileSync } from "child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type CommandResult = {
  name: string;
  command: string;
  status: "passed" | "failed" | "not_run";
  durationMs?: number;
  output: string;
  summary: string;
};

type FileChange = {
  path: string;
  additions: number;
  deletions: number;
  status: "modified" | "added" | "deleted" | "renamed" | "unknown";
};

type CommitSummary = {
  sha: string;
  message: string;
  author: string;
  date: string;
};

type DashboardCache = {
  updatedAt: string;
  sha: string;
  gates: CommandResult[];
  lastTrigger: "manual" | "auto" | "bootstrap";
};

function repoRoot(): string {
  return path.resolve(process.cwd(), "../..");
}

function runtimeDir(): string {
  return path.join(repoRoot(), "runtime");
}

function cachePath(): string {
  return path.join(runtimeDir(), "dashboard-live-cache.json");
}

function runGit(args: string[], fallback = ""): string {
  try {
    return execFileSync("git", args, {
      cwd: repoRoot(),
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      timeout: 10000,
    }).trim();
  } catch {
    return fallback;
  }
}

function runNpmScript(name: string, script: string): CommandResult {
  const started = Date.now();
  try {
    const output = execFileSync("npm", ["run", "-s", script], {
      cwd: repoRoot(),
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      timeout: 240000,
      maxBuffer: 1024 * 1024 * 12,
    });
    return {
      name,
      command: `npm run -s ${script}`,
      status: "passed",
      durationMs: Date.now() - started,
      output: output.trim().slice(-18000),
      summary: summarizeCommandOutput(output, script, true),
    };
  } catch (err: any) {
    const output = `${err?.stdout || ""}\n${err?.stderr || ""}`.trim();
    return {
      name,
      command: `npm run -s ${script}`,
      status: "failed",
      durationMs: Date.now() - started,
      output: output.slice(-18000),
      summary: summarizeCommandOutput(output, script, false),
    };
  }
}

function runCiGates(): CommandResult[] {
  const gates: CommandResult[] = [];
  gates.push(runNpmScript("Build", "build"));
  if (gates[gates.length - 1].status === "failed") return gates;
  gates.push(runNpmScript("Tests", "test:universal"));
  if (gates[gates.length - 1].status === "failed") return gates;
  gates.push(runNpmScript("Validate:All", "validate:all"));
  return gates;
}

function summarizeCommandOutput(output: string, script: string, passed: boolean): string {
  const text = output || "";
  if (script === "validate:all") {
    const executed = text.match(/Executed:\s*(\d+)/)?.[1];
    const passedCount = text.match(/Passed:\s*(\d+)/)?.[1];
    const failedCount = text.match(/Failed:\s*(\d+)/)?.[1];
    if (executed || passedCount || failedCount) return `${passedCount || "0"}/${executed || "?"} validators passed, ${failedCount || "0"} failed`;
    return passed ? "Validator suite passed" : "Validator suite failed";
  }
  if (script === "test:universal") {
    const passedLines = (text.match(/\.test\.ts passed/g) || []).length;
    return passedLines ? `${passedLines} universal test files passed` : passed ? "Universal tests passed" : "Universal tests failed";
  }
  if (script === "build") return passed ? "Production UI build passed" : "Production UI build failed";
  return passed ? "Command passed" : "Command failed";
}

function parseLatestCommit(): CommitSummary {
  const raw = runGit(["log", "-1", "--pretty=format:%H%x1f%s%x1f%an%x1f%cI"]);
  const [sha = "unknown", message = "No commit", author = "unknown", date = ""] = raw.split("\x1f");
  return { sha, message, author, date };
}

function parseCommitHistory(): CommitSummary[] {
  const raw = runGit(["log", "-5", "--pretty=format:%H%x1f%s%x1f%an%x1f%cI%x1e"]);
  return raw.split("\x1e").map((row) => row.trim()).filter(Boolean).map((row) => {
    const [sha = "unknown", message = "No commit", author = "unknown", date = ""] = row.split("\x1f");
    return { sha, message, author, date };
  });
}

function parseFileChanges(): FileChange[] {
  const status = runGit(["status", "--porcelain=v1"]);
  const diffNumstat = runGit(["diff", "--numstat"]);
  const stagedNumstat = runGit(["diff", "--cached", "--numstat"]);
  const stats = new Map<string, { additions: number; deletions: number }>();

  for (const line of `${diffNumstat}\n${stagedNumstat}`.split("\n")) {
    const parts = line.trim().split(/\s+/);
    if (parts.length < 3) continue;
    const additions = Number(parts[0]) || 0;
    const deletions = Number(parts[1]) || 0;
    const file = parts.slice(2).join(" ");
    const previous = stats.get(file) || { additions: 0, deletions: 0 };
    stats.set(file, { additions: previous.additions + additions, deletions: previous.deletions + deletions });
  }

  if (!status) {
    const latest = runGit(["show", "--numstat", "--format=", "HEAD"]);
    return latest.split("\n").map((line) => line.trim()).filter(Boolean).map((line) => {
      const parts = line.split(/\s+/);
      const additions = Number(parts[0]) || 0;
      const deletions = Number(parts[1]) || 0;
      const file = parts.slice(2).join(" ");
      return { path: file, additions, deletions, status: "unknown" as const };
    }).filter((item) => item.path && item.path !== "runtime/").slice(0, 60);
  }

  return status.split("\n").map((line) => {
    const code = line.slice(0, 2);
    const file = line.slice(3).trim();
    const stat = stats.get(file) || { additions: 0, deletions: 0 };
    const itemStatus: FileChange["status"] = code.includes("A") || code.includes("?") ? "added" : code.includes("D") ? "deleted" : code.includes("R") ? "renamed" : code.trim() ? "modified" : "unknown";
    return { path: file, additions: stat.additions, deletions: stat.deletions, status: itemStatus };
  }).filter((item) => Boolean(item.path) && item.path !== "runtime/");
}

function parseRemoteStatus() {
  runGit(["remote", "update", "origin", "--prune"], "");
  const branch = runGit(["rev-parse", "--abbrev-ref", "HEAD"], "main");
  const local = runGit(["rev-parse", "HEAD"], "unknown");
  const remote = runGit(["rev-parse", `origin/${branch}`], "unknown");
  const aheadBehind = runGit(["rev-list", "--left-right", "--count", `${branch}...origin/${branch}`], "0\t0");
  const [ahead = "0", behind = "0"] = aheadBehind.split(/\s+/);
  return { branch, localSha: local, remoteSha: remote, ahead: Number(ahead) || 0, behind: Number(behind) || 0, upToDate: local === remote };
}

function readCache(): DashboardCache | null {
  try {
    if (!existsSync(cachePath())) return null;
    const parsed = JSON.parse(readFileSync(cachePath(), "utf8"));
    if (!Array.isArray(parsed?.gates)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeCache(gates: CommandResult[], sha: string, lastTrigger: DashboardCache["lastTrigger"]) {
  mkdirSync(runtimeDir(), { recursive: true });
  writeFileSync(cachePath(), JSON.stringify({ updatedAt: new Date().toISOString(), sha, gates, lastTrigger }, null, 2));
}

async function fetchPullRequests() {
  try {
    const owner = process.env.GITHUB_OWNER || process.env.NEXT_PUBLIC_GITHUB_OWNER || "";
    const repo = process.env.GITHUB_REPO || process.env.NEXT_PUBLIC_GITHUB_REPO || "";
    if (!owner || !repo) return { status: "unavailable", items: [] };
    const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/pulls?state=open&per_page=8`, {
      headers: { Accept: "application/vnd.github+json", "User-Agent": "Botomatic-local-dashboard" },
      cache: "no-store",
    });
    if (!response.ok) return { status: "unavailable", items: [] };
    const prs = await response.json();
    return { status: "ok", items: Array.isArray(prs) ? prs.map((pr: any) => ({ number: pr.number, title: pr.title, state: pr.state, url: pr.html_url, author: pr.user?.login || "unknown", branch: pr.head?.ref || "unknown", updatedAt: pr.updated_at })) : [] };
  } catch {
    return { status: "unavailable", items: [] };
  }
}

async function buildResponse(cache: DashboardCache | null) {
  const remote = parseRemoteStatus();
  const commit = parseLatestCommit();
  const filesChanged = parseFileChanges();
  const totals = filesChanged.reduce((acc, file) => ({ additions: acc.additions + file.additions, deletions: acc.deletions + file.deletions }), { additions: 0, deletions: 0 });
  const gates = cache?.gates || [];
  const failedGateCount = gates.filter((gate) => gate.status === "failed").length;
  const passedGateCount = gates.filter((gate) => gate.status === "passed").length;

  return {
    generatedAt: new Date().toISOString(),
    repository: { name: "skylersemailaddress-debug/Botomatic", url: "https://github.com/skylersemailaddress-debug/Botomatic", branch: remote.branch, localSha: remote.localSha, remoteSha: remote.remoteSha, upToDate: remote.upToDate, ahead: remote.ahead, behind: remote.behind },
    latestCommit: commit,
    commitHistory: parseCommitHistory(),
    pullRequests: await fetchPullRequests(),
    filesChanged,
    totals,
    gates,
    gateSummary: { passed: passedGateCount, failed: failedGateCount, total: gates.length, allPassed: gates.length > 0 && failedGateCount === 0, updatedAt: cache?.updatedAt || null, sha: cache?.sha || null, lastTrigger: cache?.lastTrigger || null, stale: cache?.sha !== remote.localSha },
  };
}

export async function GET(request: NextRequest) {
  const runGates = request.nextUrl.searchParams.get("runGates") === "1";
  const autoRunOnChange = request.nextUrl.searchParams.get("autoRunOnChange") === "1";
  const remote = parseRemoteStatus();
  let cache = readCache();
  const shouldBootstrap = Boolean(autoRunOnChange && (!cache || cache.gates.length === 0));
  const changedSinceLastGateRun = cache?.sha !== remote.localSha;

  if (runGates || shouldBootstrap || (autoRunOnChange && changedSinceLastGateRun)) {
    const gates = runCiGates();
    writeCache(gates, remote.localSha, runGates ? "manual" : shouldBootstrap ? "bootstrap" : "auto");
    cache = readCache();
  }

  return NextResponse.json(await buildResponse(cache));
}
