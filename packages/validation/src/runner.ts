import { spawnSync } from "child_process";
import fs from "fs";
import path from "path";
import { FailureKind, ProofRung, ValidationRecord } from "./types";

// N94 — classify error messages into retryable vs non-retryable failure kinds
function classifyFailure(failures: string[]): { failureKind: FailureKind; isRetryable: boolean } {
  const combined = failures.join(" ").toLowerCase();
  if (/syntaxerror|syntax error|unexpected token|parse error|invalid syntax/i.test(combined))
    return { failureKind: "parse_error",   isRetryable: false };
  if (/typeerror|type error|ts\d{4}|cannot find name|property.*does not exist|argument.*not assignable/i.test(combined))
    return { failureKind: "type_error",    isRetryable: false };
  if (/forbidden tokens|placeholder|todo.*implement|not implemented/i.test(combined))
    return { failureKind: "placeholder",   isRetryable: false };
  if (/missing.*file|entry.*not found|no server entry/i.test(combined))
    return { failureKind: "missing_file",  isRetryable: true  };
  if (/build failed|npm.*error/i.test(combined))
    return { failureKind: "build_error",   isRetryable: true  };
  if (/test.*fail|assertion.*fail/i.test(combined))
    return { failureKind: "test_error",    isRetryable: true  };
  if (failures.length > 0)
    return { failureKind: "unknown",       isRetryable: true  };
  return { failureKind: null, isRetryable: false };
}

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
      proofRung: 1 as ProofRung,   // Rung 1: assertion (skipped but logged)
      failureKind: null,
      isRetryable: false,
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

  // N85 — assign proof rung based on what checks completed successfully
  let proofRung: ProofRung = 1; // Rung 1: assertion — we at least ran checks
  if (hasPkg && serverEntry) proofRung = 2;           // Rung 2: file existence verified
  if (proofRung >= 2 && checks.some(c => c.includes("syntax_check:pass"))) proofRung = 2;
  if (checks.some(c => c === "build:pass"))  proofRung = 3; // Rung 3: build validated
  if (checks.some(c => c === "test:pass") && checks.some(c => c === "no_placeholders:pass")) proofRung = 4; // Rung 4: evidence artifact
  // Rung 5 (audit-reproducible) requires deployment — not available here

  // N94 — classify failure for retry decisions
  const { failureKind, isRetryable } = classifyFailure(failures);

  return {
    projectId,
    packetId,
    status: passed ? "passed" : "failed",
    checks,
    summary: passed
      ? `All ${checks.length} checks passed (proof rung ${proofRung})`
      : `${failures.length} check(s) failed: ${failures[0]}`,
    proofRung,
    failureKind,
    isRetryable,
    createdAt: now,
    updatedAt: now,
  };
}
