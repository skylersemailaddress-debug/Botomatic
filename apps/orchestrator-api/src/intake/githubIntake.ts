import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";

const SKIP_SEGMENTS = new Set(["node_modules", ".git", "dist", "build", ".next", "target", "vendor", "coverage"]);

const SECRET_PATTERNS: RegExp[] = [
  /sk_live_[0-9A-Za-z]{10,}/,
  /gh[pousr]_[0-9A-Za-z]{20,}/,
  /AKIA[0-9A-Z]{16}/,
  /xox[baprs]-[0-9A-Za-z-]{10,}/,
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  /eyJ[a-zA-Z0-9_-]{8,}\.[a-zA-Z0-9_-]{8,}\.[a-zA-Z0-9_-]{8,}/,
];

export type ParsedGitHubRef = {
  url: string;
  owner: string;
  repo: string;
  kind: "repo" | "branch" | "pr";
  branch: string | null;
  prNumber: number | null;
};

export type GitHubIntakeResult = {
  provider: "github";
  parsed: ParsedGitHubRef;
  defaultBranch: string | null;
  fileCountEstimate: number;
  repoSizeEstimateBytes: number;
  skippedPaths: string[];
  detectedLanguages: string[];
  detectedFrameworks: string[];
  detectedPackageManagers: string[];
  secretScanResult: { status: "passed" | "flagged"; findings: string[] };
  riskSignals: string[];
  metadataOnly: boolean;
  authRequired: boolean;
  authStatus: "not_required" | "required" | "provided" | "missing";
  clonePath?: string;
};

export function parseGitHubUrl(input: string): ParsedGitHubRef {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    throw new Error("Invalid GitHub URL.");
  }

  if (url.hostname !== "github.com") {
    throw new Error("Only github.com URLs are supported for GitHub intake.");
  }

  const segments = url.pathname.split("/").filter(Boolean);
  if (segments.length < 2) {
    throw new Error("GitHub URL must include owner and repo.");
  }

  const owner = segments[0];
  const repo = String(segments[1] || "").replace(/\.git$/, "");

  if (segments[2] === "tree" && segments[3]) {
    return { url: input, owner, repo, kind: "branch", branch: decodeURIComponent(segments[3]), prNumber: null };
  }
  if (segments[2] === "pull" && segments[3] && /^\d+$/.test(segments[3])) {
    return { url: input, owner, repo, kind: "pr", branch: null, prNumber: Number(segments[3]) };
  }

  return { url: input, owner, repo, kind: "repo", branch: null, prNumber: null };
}

function runGit(args: string[], cwd?: string): string {
  const result = spawnSync("git", args, {
    cwd,
    encoding: "utf8",
    env: process.env,
    timeout: 60000,
  });
  if (result.status !== 0) {
    throw new Error(String(result.stderr || result.stdout || "Git command failed."));
  }
  return String(result.stdout || "").trim();
}

function detectFromPaths(paths: string[]) {
  const languages = new Set<string>();
  const frameworks = new Set<string>();
  const packageManagers = new Set<string>();

  for (const p of paths) {
    const lower = p.toLowerCase();
    if (lower.endsWith(".ts") || lower.endsWith(".tsx")) languages.add("typescript");
    if (lower.endsWith(".js") || lower.endsWith(".jsx")) languages.add("javascript");
    if (lower.endsWith(".py")) languages.add("python");
    if (lower.endsWith(".go")) languages.add("go");
    if (lower.endsWith(".rs")) languages.add("rust");
    if (lower.endsWith(".java")) languages.add("java");
    if (lower.endsWith(".cs")) languages.add("csharp");
    if (lower.endsWith(".php")) languages.add("php");
    if (lower.endsWith(".rb")) languages.add("ruby");

    if (lower.includes("next.config")) frameworks.add("nextjs");
    if (lower.includes("vite.config")) frameworks.add("vite");
    if (lower.includes("nuxt.config")) frameworks.add("nuxt");
    if (lower.includes("angular.json")) frameworks.add("angular");
    if (lower.includes("requirements.txt") || lower.includes("pyproject.toml")) frameworks.add("python-app");

    if (lower.endsWith("pnpm-lock.yaml")) packageManagers.add("pnpm");
    if (lower.endsWith("yarn.lock")) packageManagers.add("yarn");
    if (lower.endsWith("package-lock.json")) packageManagers.add("npm");
    if (lower.endsWith("poetry.lock")) packageManagers.add("poetry");
    if (lower.endsWith("go.sum")) packageManagers.add("go-mod");
    if (lower.endsWith("cargo.lock")) packageManagers.add("cargo");
  }

  return {
    detectedLanguages: Array.from(languages).sort(),
    detectedFrameworks: Array.from(frameworks).sort(),
    detectedPackageManagers: Array.from(packageManagers).sort(),
  };
}

function scanTextFilesForSecrets(repoDir: string, paths: string[]): { status: "passed" | "flagged"; findings: string[] } {
  const findings: string[] = [];
  const candidates = paths.filter((p) => /\.(md|txt|json|yml|yaml|env|ts|tsx|js|jsx|py|go|rs|java|cs|php|rb)$/i.test(p)).slice(0, 200);
  for (const rel of candidates) {
    const full = path.join(repoDir, rel);
    try {
      const stat = fs.statSync(full);
      if (stat.size > 512 * 1024) {
        continue;
      }
      const content = fs.readFileSync(full, "utf8");
      if (SECRET_PATTERNS.some((pattern) => pattern.test(content))) {
        findings.push(rel);
        if (findings.length >= 20) break;
      }
    } catch {
      // ignore unreadable files during scanning
    }
  }

  return {
    status: findings.length > 0 ? "flagged" : "passed",
    findings,
  };
}

export function intakeGithubSource(params: {
  sourceUrl: string;
  rootDir: string;
  sourceId: string;
  allowClone: boolean;
  githubToken?: string;
}): GitHubIntakeResult {
  const parsed = parseGitHubUrl(params.sourceUrl);
  const cloneUrl = `https://github.com/${parsed.owner}/${parsed.repo}.git`;

  let defaultBranch: string | null = null;
  let authRequired = false;
  let authStatus: "not_required" | "required" | "provided" | "missing" = "not_required";

  try {
    const symref = runGit(["ls-remote", "--symref", cloneUrl, "HEAD"]);
    const headLine = symref.split("\n").find((line) => line.startsWith("ref:")) || "";
    defaultBranch = headLine ? headLine.split("\t")[0].replace("ref:", "").trim().replace("refs/heads/", "") : null;
  } catch (error: any) {
    const msg = String(error?.message || error).toLowerCase();
    const missingAuth = msg.includes("authentication") || msg.includes("permission") || msg.includes("not found");
    if (missingAuth) {
      authRequired = true;
      authStatus = params.githubToken ? "provided" : "missing";
    }
  }

  if (!params.allowClone || authRequired) {
    return {
      provider: "github",
      parsed,
      defaultBranch,
      fileCountEstimate: 0,
      repoSizeEstimateBytes: 0,
      skippedPaths: [],
      detectedLanguages: [],
      detectedFrameworks: [],
      detectedPackageManagers: [],
      secretScanResult: { status: "passed", findings: [] },
      riskSignals: authRequired ? ["requires_auth_for_repo_access"] : [],
      metadataOnly: true,
      authRequired,
      authStatus,
    };
  }

  const checkoutBranch = parsed.kind === "branch" && parsed.branch ? parsed.branch : defaultBranch || "HEAD";
  const cloneRoot = path.join(params.rootDir, "runtime", "uploads", "github-intake", params.sourceId);
  fs.mkdirSync(path.dirname(cloneRoot), { recursive: true });

  runGit(["clone", "--depth", "1", "--filter=blob:none", "--branch", checkoutBranch, cloneUrl, cloneRoot]);

  let paths = runGit(["-C", cloneRoot, "ls-files"]).split("\n").map((line) => line.trim()).filter(Boolean);
  const skippedPaths: string[] = [];
  paths = paths.filter((p) => {
    const blocked = p.split("/").some((segment) => SKIP_SEGMENTS.has(segment.toLowerCase()));
    if (blocked) skippedPaths.push(p);
    return !blocked;
  });

  const { detectedLanguages, detectedFrameworks, detectedPackageManagers } = detectFromPaths(paths);
  const secretScanResult = scanTextFilesForSecrets(cloneRoot, paths);

  let repoSizeEstimateBytes = 0;
  for (const rel of paths.slice(0, 5000)) {
    try {
      repoSizeEstimateBytes += fs.statSync(path.join(cloneRoot, rel)).size;
    } catch {
      // ignore stat issues
    }
  }

  const riskSignals: string[] = [];
  if (secretScanResult.status === "flagged") {
    riskSignals.push("potential_secrets_detected");
  }

  return {
    provider: "github",
    parsed,
    defaultBranch,
    fileCountEstimate: paths.length,
    repoSizeEstimateBytes,
    skippedPaths,
    detectedLanguages,
    detectedFrameworks,
    detectedPackageManagers,
    secretScanResult,
    riskSignals,
    metadataOnly: false,
    authRequired,
    authStatus,
    clonePath: cloneRoot,
  };
}
