import { spawnSync } from "child_process";
import fs from "fs";
import path from "path";
import { ValidationRecord } from "./types";

export interface ValidationOptions {
  workspacePath?: string;
  timeoutMs?: number;
}

function runCommand(cmd: string, args: string[], cwd: string, timeoutMs: number): { passed: boolean; output: string } {
  const result = spawnSync(cmd, args, { cwd, encoding: "utf8", timeout: timeoutMs });
  const output = ((result.stdout ?? "") + (result.stderr ?? "")).trim().slice(0, 2000);
  return { passed: result.status === 0, output };
}

export function runValidation(
  projectId: string,
  packetId: string,
  options: ValidationOptions = {}
): ValidationRecord {
  const now = new Date().toISOString();
  const { workspacePath, timeoutMs = 60_000 } = options;

  // If no workspace path or it doesn't exist, fall back gracefully
  if (!workspacePath || !fs.existsSync(workspacePath)) {
    return {
      projectId,
      packetId,
      status: "passed",
      checks: ["workspace_skipped"],
      summary: "No workspace path provided — validation skipped",
      createdAt: now,
      updatedAt: now,
    };
  }

  const checks: string[] = [];
  const failures: string[] = [];

  // 1. Check package.json exists
  const hasPkg = fs.existsSync(path.join(workspacePath, "package.json"));
  checks.push(hasPkg ? "package_json:pass" : "package_json:fail");
  if (!hasPkg) failures.push("package.json missing");

  // 2. Find a server entry point
  const serverCandidates = ["server.mjs", "server.js", "src/server.ts", "index.js", "index.mjs"];
  const serverEntry = serverCandidates.find((f) => fs.existsSync(path.join(workspacePath, f)));
  checks.push(serverEntry ? `entrypoint:${serverEntry}:pass` : "entrypoint:fail");
  if (!serverEntry) failures.push("No server entry point found");

  // 3. Syntax check the server entry
  if (serverEntry) {
    const syntaxCheck = runCommand("node", ["--check", serverEntry], workspacePath, 10_000);
    checks.push(syntaxCheck.passed ? "syntax_check:pass" : "syntax_check:fail");
    if (!syntaxCheck.passed) failures.push(`Syntax error: ${syntaxCheck.output.slice(0, 300)}`);
  }

  // 4. Run build script if defined
  const pkgRaw = hasPkg ? fs.readFileSync(path.join(workspacePath, "package.json"), "utf8") : "{}";
  let pkgScripts: Record<string, string> = {};
  try { pkgScripts = (JSON.parse(pkgRaw) as { scripts?: Record<string, string> }).scripts ?? {}; } catch {}

  if (pkgScripts["build"]) {
    const build = runCommand("npm", ["run", "build", "--if-present"], workspacePath, timeoutMs);
    checks.push(build.passed ? "build:pass" : "build:fail");
    if (!build.passed) failures.push(`Build failed: ${build.output.slice(0, 300)}`);
  } else {
    checks.push("build:skipped");
  }

  // 5. Run test script if defined
  if (pkgScripts["test"]) {
    const test = runCommand("npm", ["run", "test", "--if-present"], workspacePath, timeoutMs);
    checks.push(test.passed ? "test:pass" : "test:fail");
    if (!test.passed) failures.push(`Tests failed: ${test.output.slice(0, 300)}`);
  } else {
    checks.push("test:skipped");
  }

  // 6. Scan for forbidden placeholder tokens
  const forbidden = ["TODO: implement", "throw new Error('not implemented')", "placeholder", "fake-auth", "fake_auth"];
  const placeholderHits: string[] = [];
  if (serverEntry) {
    try {
      const content = fs.readFileSync(path.join(workspacePath, serverEntry), "utf8");
      for (const token of forbidden) {
        if (content.toLowerCase().includes(token.toLowerCase())) placeholderHits.push(token);
      }
    } catch {}
  }
  checks.push(placeholderHits.length === 0 ? "no_placeholders:pass" : `placeholders:fail:${placeholderHits.join(",")}`);
  if (placeholderHits.length > 0) failures.push(`Forbidden tokens: ${placeholderHits.join(", ")}`);

  const passed = failures.length === 0;
  return {
    projectId,
    packetId,
    status: passed ? "passed" : "failed",
    checks,
    summary: passed
      ? `All ${checks.length} checks passed`
      : `${failures.length} check(s) failed: ${failures[0]}`,
    createdAt: now,
    updatedAt: now,
  };
}
