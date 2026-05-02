import fs from "fs/promises";
import fsSync from "fs";
import path from "path";
import { spawn } from "child_process";
import { buildCorpus, scoringRubric } from "./corpus.mjs";

const ROOT = process.cwd();
const RECEIPT_ROOT = path.join(ROOT, "receipts", "builder-forensic");
const RUN_ROOT = path.join(RECEIPT_ROOT, "runs");
const WINDOW_FILE = path.join(RECEIPT_ROOT, "runtime-window.json");
const API_BASE_URL = process.env.API_BASE_URL || "http://127.0.0.1:3001";
const TOKEN = process.env.BOTOMATIC_API_TOKEN || process.env.NEXT_PUBLIC_BOTOMATIC_API_TOKEN || "dev-api-token";

const MODE = (process.argv[2] || "smoke").toLowerCase();

const modeLimit = {
  smoke: 25,
  "100": 100,
  "200": 200,
  repair: 50,
  extreme: 25,
};

const classifications = {
  PASS_REAL: "PASS_REAL",
  PASS_PARTIAL: "PASS_PARTIAL",
  BLOCKED_UNSUPPORTED: "BLOCKED_UNSUPPORTED",
  FAIL_BUILDER: "FAIL_BUILDER",
  FAIL_RUNTIME: "FAIL_RUNTIME",
  FAIL_QUALITY: "FAIL_QUALITY",
  FAIL_FAKE: "FAIL_FAKE",
};

function now() {
  return new Date().toISOString();
}

function runId(mode) {
  return `${mode}-${new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14)}`;
}

async function registerRunInWindow(runIdValue, mode) {
  try {
    const raw = await fs.readFile(WINDOW_FILE, "utf8");
    const parsed = JSON.parse(raw);
    const runs = Array.isArray(parsed.runs) ? parsed.runs : [];
    runs.push({ runId: runIdValue, mode, finishedAt: now() });
    parsed.runs = runs;
    parsed.finishedAt = now();
    await fs.writeFile(WINDOW_FILE, JSON.stringify(parsed, null, 2), "utf8");
  } catch {
    // Window file is optional; do not fail a run if it does not exist.
  }
}

function pickCases(corpus, mode) {
  const limit = modeLimit[mode] || 25;
  if (mode === "extreme") {
    return corpus.items.filter((item) => item.complexity === "hard" || item.complexity === "extreme").slice(0, limit);
  }
  if (mode === "repair") {
    return corpus.items
      .filter((item) => item.category.includes("follow-up") || item.category.includes("edit") || item.category.includes("recovery") || item.category.includes("dirty-repo"))
      .slice(0, limit);
  }
  return corpus.items.slice(0, limit);
}

async function safeFetchJson(url, options = {}) {
  const startedAt = Date.now();
  try {
    const response = await fetch(url, options);
    const text = await response.text();
    let body = text;
    try {
      body = text ? JSON.parse(text) : null;
    } catch {
      // keep raw body
    }
    return {
      ok: response.ok,
      status: response.status,
      latencyMs: Date.now() - startedAt,
      headers: Object.fromEntries(response.headers.entries()),
      body,
      networkError: null,
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      latencyMs: Date.now() - startedAt,
      headers: {},
      body: null,
      networkError: String(error?.message || error),
    };
  }
}

function authHeaders() {
  return {
    Authorization: `Bearer ${TOKEN}`,
    "Content-Type": "application/json",
  };
}

function toScalar(value) {
  return Math.max(0, Math.min(5, Number(value || 0)));
}

export function scoreCase(caseResult) {
  const operatorHistory = Array.isArray(caseResult.operatorHistory) ? caseResult.operatorHistory : [];
  const operatorRoutes = operatorHistory
    .map((entry) => (entry && entry.body && typeof entry.body === "object" ? String(entry.body.route || "") : ""))
    .filter(Boolean);
  const details = [
    caseResult.operator?.body?.operatorMessage || "",
    JSON.stringify(caseResult.status?.body || {}),
    JSON.stringify(caseResult.execution?.body || {}),
    JSON.stringify(operatorRoutes),
  ].join("\n");
  const lower = details.toLowerCase();

  const metrics = {
    specRelevance: toScalar(lower.includes("spec") || lower.includes("master truth") ? 4 : lower.length > 0 ? 2 : 0),
    architectureCompleteness: toScalar(lower.includes("architecture") ? 4 : lower.includes("plan") ? 3 : 1),
    uiCompleteness: toScalar(lower.includes("ui") || lower.includes("page") ? 3 : 1),
    dataStateModel: toScalar(lower.includes("entity") || lower.includes("data") ? 3 : 1),
    apiBackendWiring: toScalar(lower.includes("api") || lower.includes("route") ? 3 : 1),
    honestyAuthPaymentExternal: toScalar(
      lower.includes("blocked") || lower.includes("credential") || lower.includes("not available") || lower.includes("unavailable")
        ? 5
        : 2
    ),
  };

  const fakeSignal = /(fake success|fake generated|demo-only|lorem ipsum|placeholder implementation|not implemented)/i.test(details);

  const runtimeBuildSuccess = Boolean(caseResult.localBuild?.ok);
  const generatedAppSmokeSuccess = Boolean(caseResult.runtimeSmoke?.ok);
  const testsGeneratedExecuted = Boolean(caseResult.localTests?.ok);
  const noPlaceholderFakeContent = !fakeSignal;
  const followupEditSuccess = Boolean(caseResult.followup?.ok);
  const repairLoopSuccess = Boolean(caseResult.repair?.ok);
  const reachedBuilderRuntime = Boolean(caseResult.intake?.ok && operatorHistory.some((entry) => entry?.ok));
  const generatedArtifacts = Boolean(
    Boolean(caseResult.generatedProjectPath) ||
      Boolean(caseResult.evidenceArtifactId) ||
    operatorRoutes.some((route) => ["plan", "execute_next", "autonomous_complex_build", "launch_promote"].includes(route)) ||
      (caseResult.status?.body && typeof caseResult.status.body === "object" && caseResult.status.body.plan) ||
      (caseResult.execution?.body && typeof caseResult.execution.body === "object" && caseResult.execution.body.runId)
  );
  const hasWorkspacePath = Boolean(caseResult.generatedProjectPath);
  const runtimeFailedWithWorkspace = hasWorkspacePath && (!runtimeBuildSuccess || !generatedAppSmokeSuccess);

  let commercialReadiness = "blocked";
  if (runtimeBuildSuccess && generatedAppSmokeSuccess && noPlaceholderFakeContent) commercialReadiness = "pass";
  else if (reachedBuilderRuntime && generatedArtifacts) commercialReadiness = "partial";

  let classification = classifications.FAIL_QUALITY;
  if (!caseResult.intake?.ok && caseResult.intake?.status === 0) classification = classifications.BLOCKED_UNSUPPORTED;
  else if (generatedArtifacts && !hasWorkspacePath) classification = classifications.FAIL_BUILDER;
  else if (runtimeFailedWithWorkspace) classification = classifications.FAIL_RUNTIME;
  else if (!caseResult.operator?.ok && caseResult.operator?.status >= 500) classification = classifications.FAIL_BUILDER;
  else if (fakeSignal) classification = classifications.FAIL_FAKE;
  else if (runtimeBuildSuccess && generatedAppSmokeSuccess && noPlaceholderFakeContent) classification = classifications.PASS_REAL;
  else if (reachedBuilderRuntime && generatedArtifacts) classification = classifications.PASS_PARTIAL;
  else if (caseResult.runtimeSmoke && !caseResult.runtimeSmoke.ok) classification = classifications.FAIL_RUNTIME;

  return {
    metrics,
    checks: {
      reachedBuilderRuntime,
      generatedArtifacts,
      runtimeBuildSuccess,
      generatedAppSmokeSuccess,
      testsGeneratedExecuted,
      noPlaceholderFakeContent,
      followupEditSuccess,
      repairLoopSuccess,
      commercialReadiness,
    },
    classification,
    fakeSignal,
  };
}

function summarizeCases(cases) {
  const byCategory = {};
  const byClassification = {};
  let reachedBuilderRuntime = 0;
  let generatedArtifacts = 0;
  let runtimeSuccess = 0;
  let partial = 0;
  let unsupported = 0;
  let followupSuccess = 0;
  let repairSuccess = 0;
  let fakeCount = 0;

  for (const c of cases) {
    byCategory[c.category] ||= { total: 0, passReal: 0, passPartial: 0, failed: 0 };
    byCategory[c.category].total += 1;

    byClassification[c.score.classification] = (byClassification[c.score.classification] || 0) + 1;
    if (c.score.classification === classifications.PASS_REAL) byCategory[c.category].passReal += 1;
    else if (c.score.classification === classifications.PASS_PARTIAL) byCategory[c.category].passPartial += 1;
    else byCategory[c.category].failed += 1;

    if (c.score.checks.reachedBuilderRuntime) reachedBuilderRuntime += 1;
    if (c.score.checks.generatedArtifacts) generatedArtifacts += 1;
    if (c.score.checks.runtimeBuildSuccess) runtimeSuccess += 1;
    if (c.score.classification === classifications.PASS_PARTIAL) partial += 1;
    if (c.score.classification === classifications.BLOCKED_UNSUPPORTED) unsupported += 1;
    if (c.score.checks.followupEditSuccess) followupSuccess += 1;
    if (c.score.checks.repairLoopSuccess) repairSuccess += 1;
    if (c.score.fakeSignal) fakeCount += 1;
  }

  return {
    total: cases.length,
    passReal: byClassification[classifications.PASS_REAL] || 0,
    passPartial: byClassification[classifications.PASS_PARTIAL] || 0,
    blockedUnsupported: byClassification[classifications.BLOCKED_UNSUPPORTED] || 0,
    reachedBuilderRuntime,
    generatedArtifacts,
    failBuilder: byClassification[classifications.FAIL_BUILDER] || 0,
    failRuntime: byClassification[classifications.FAIL_RUNTIME] || 0,
    failQuality: byClassification[classifications.FAIL_QUALITY] || 0,
    failFake: byClassification[classifications.FAIL_FAKE] || 0,
    runtimeSuccess,
    partial,
    unsupported,
    followupSuccess,
    repairSuccess,
    fakeCount,
    byCategory,
    byClassification,
  };
}

async function runCommand(command, args, cwd, timeoutMs = 180000) {
  return new Promise((resolve) => {
    const child = spawn(command, args, { cwd, stdio: ["ignore", "pipe", "pipe"] });
    const stdout = [];
    const stderr = [];
    let timedOut = false;

    const timer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGTERM");
    }, timeoutMs);

    child.stdout.on("data", (d) => stdout.push(String(d)));
    child.stderr.on("data", (d) => stderr.push(String(d)));

    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({
        ok: code === 0 && !timedOut,
        code,
        timedOut,
        stdout: stdout.join("").slice(0, 6000),
        stderr: stderr.join("").slice(0, 6000),
      });
    });
  });
}

async function probeUrl(url, timeoutMs = 20000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const response = await fetch(url, { method: "GET" });
      if (response.status >= 200 && response.status < 500) {
        return { ok: true, status: response.status };
      }
    } catch {
      // keep probing until timeout
    }
    await new Promise((resolve) => setTimeout(resolve, 400));
  }
  return { ok: false, status: 0 };
}

function packageManagerFor(projectPath) {
  if (fsSync.existsSync(path.join(projectPath, "pnpm-lock.yaml"))) return "pnpm";
  if (fsSync.existsSync(path.join(projectPath, "yarn.lock"))) return "yarn";
  return "npm";
}

function managerArgs(manager, script) {
  if (manager === "pnpm") return ["run", script];
  if (manager === "yarn") return [script];
  return ["run", "-s", script];
}

export async function runGeneratedAppBuildRunSmoke(projectPath) {
  const manager = packageManagerFor(projectPath);
  const validationLogs = [];
  const installCommand = manager === "npm" ? "npm install" : manager === "pnpm" ? "pnpm install" : "yarn install";
  const installArgs = manager === "npm" ? ["install"] : manager === "pnpm" ? ["install"] : ["install"];
  const installResult = await runCommand(manager, installArgs, projectPath, 300000);
  validationLogs.push(`install:${installResult.ok ? "ok" : "failed"}`);
  if (!installResult.ok) {
    return {
      packageManager: manager,
      buildCommand: `${manager} ${managerArgs(manager, "build").join(" ")}`,
      runCommand: `${manager} ${managerArgs(manager, "start").join(" ")}`,
      installResult,
      buildResult: { ok: false, code: 1, timedOut: false, stdout: "", stderr: "install_failed" },
      runResult: { ok: false, status: "not_started" },
      smokeResult: { ok: false, status: 0 },
      previewUrl: null,
      validationLogs,
    };
  }

  const buildArgs = managerArgs(manager, "build");
  const buildResult = await runCommand(manager, buildArgs, projectPath, 300000);
  validationLogs.push(`build:${buildResult.ok ? "ok" : "failed"}`);
  if (!buildResult.ok) {
    return {
      packageManager: manager,
      buildCommand: `${manager} ${buildArgs.join(" ")}`,
      runCommand: `${manager} ${managerArgs(manager, "start").join(" ")}`,
      installResult,
      buildResult,
      runResult: { ok: false, status: "not_started" },
      smokeResult: { ok: false, status: 0 },
      previewUrl: null,
      validationLogs,
    };
  }

  const port = 4300 + Math.floor(Math.random() * 400);
  const previewUrl = `http://127.0.0.1:${port}/`;
  const runArgs = managerArgs(manager, "start");
  const child = spawn(manager, runArgs, {
    cwd: projectPath,
    env: { ...process.env, PORT: String(port) },
    stdio: ["ignore", "pipe", "pipe"],
  });

  const runtimeLines = [];
  child.stdout.on("data", (d) => runtimeLines.push(String(d)));
  child.stderr.on("data", (d) => runtimeLines.push(String(d)));

  const smokeResult = await probeUrl(previewUrl, 30000);
  validationLogs.push(`smoke:${smokeResult.ok ? "ok" : "failed"}`);
  child.kill("SIGTERM");

  return {
    packageManager: manager,
    buildCommand: `${manager} ${buildArgs.join(" ")}`,
    runCommand: `${manager} ${runArgs.join(" ")}`,
    installResult,
    buildResult,
    runResult: { ok: smokeResult.ok, status: smokeResult.ok ? "started" : "failed", lines: runtimeLines.join("").slice(0, 6000) },
    smokeResult,
    previewUrl,
    validationLogs,
  };
}

export async function executeCase(testCase, options) {
  const intakePayload = {
    name: `Builder Forensic ${testCase.id}`,
    request: testCase.prompt,
  };

  const intake = await safeFetchJson(`${API_BASE_URL}/api/projects/intake`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(intakePayload),
  });

  let operator = null;
  const operatorHistory = [];
  let status = null;
  let runtime = null;
  let execution = null;
  let followup = null;
  let repair = null;

  const projectId = intake.body && typeof intake.body === "object" ? intake.body.projectId : null;

  if (intake.ok && projectId) {
    await safeFetchJson(`${API_BASE_URL}/api/projects/${projectId}/spec/analyze`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ message: testCase.prompt }),
    });
    await safeFetchJson(`${API_BASE_URL}/api/projects/${projectId}/spec/build-contract`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({}),
    });

    const operatorMessages = [
      "continue current generated app build",
      "continue current generated app build",
      "continue current generated app build",
      "continue current generated app build",
    ];

    for (const message of operatorMessages) {
      const response = await safeFetchJson(`${API_BASE_URL}/api/projects/${projectId}/operator/send`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ message }),
      });
      operatorHistory.push(response);
      operator = response;

      if (!response.ok) break;
      const route = String((response.body && typeof response.body === "object" ? response.body.route : "") || "");
      if (["execute_next", "autonomous_complex_build", "launch_promote", "execute_report"].includes(route)) break;
      if (route === "build_blocked") {
        await safeFetchJson(`${API_BASE_URL}/api/projects/${projectId}/compile`, {
          method: "POST",
          headers: authHeaders(),
          body: JSON.stringify({}),
        });
      }
    }

    status = await safeFetchJson(`${API_BASE_URL}/api/projects/${projectId}/status`, {
      method: "GET",
      headers: { Authorization: `Bearer ${TOKEN}` },
    });

    runtime = await safeFetchJson(`${API_BASE_URL}/api/projects/${projectId}/runtime`, {
      method: "GET",
      headers: { Authorization: `Bearer ${TOKEN}` },
    });

    execution = await safeFetchJson(`${API_BASE_URL}/api/projects/${projectId}/execution`, {
      method: "GET",
      headers: { Authorization: `Bearer ${TOKEN}` },
    });

    if (options.runFollowup) {
      followup = await safeFetchJson(`${API_BASE_URL}/api/projects/${projectId}/operator/send`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ message: options.followupPrompt }),
      });
    }

    if (options.runRepair) {
      repair = await safeFetchJson(`${API_BASE_URL}/api/projects/${projectId}/repair/replay`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ reason: "builder_forensic_runtime_failure" }),
      });
    }
  } else {
    if (options.runFollowup) {
      followup = {
        ok: false,
        status: 0,
        latencyMs: 0,
        headers: {},
        body: null,
        networkError: "blocked: follow-up skipped because intake did not return projectId",
      };
    }

    if (options.runRepair) {
      repair = {
        ok: false,
        status: 0,
        latencyMs: 0,
        headers: {},
        body: null,
        networkError: "blocked: repair skipped because intake did not return projectId",
      };
    }
  }

  // Local runtime/build/test probes are only attempted when explicit project paths are returned.
  const projectPath =
    (status?.body && typeof status.body === "object" && (status.body.generatedProjectPath || status.body.projectPath || status.body.workspacePath)) ||
    (runtime?.body && typeof runtime.body === "object" && (runtime.body.generatedProjectPath || runtime.body.projectPath || runtime.body.workspacePath)) ||
    null;
  const evidenceArtifactId =
    (status?.body && typeof status.body === "object" && (status.body.evidenceArtifactId || null)) ||
    (runtime?.body && typeof runtime.body === "object" && (runtime.body.evidenceArtifactId || null)) ||
    null;

  let localBuild = null;
  let localTests = null;
  let runtimeSmoke = null;
  let runCommandResult = null;
  let buildCommand = null;
  let runCommandText = null;
  let previewUrl = null;
  let validationLogs = [];

  if (projectPath && typeof projectPath === "string") {
    const proof = await runGeneratedAppBuildRunSmoke(projectPath);
    localBuild = proof.buildResult;
    localTests = await runCommand("npm", ["run", "-s", "test"], projectPath, 180000);
    runtimeSmoke = {
      ok: proof.smokeResult.ok,
      code: proof.smokeResult.ok ? 0 : 1,
      timedOut: false,
      stdout: proof.smokeResult.ok ? "smoke_ok" : "",
      stderr: proof.smokeResult.ok ? "" : "smoke_failed",
    };
    runCommandResult = proof.runResult;
    buildCommand = proof.buildCommand;
    runCommandText = proof.runCommand;
    previewUrl = proof.previewUrl;
    validationLogs = proof.validationLogs;
  }

  const result = {
    id: testCase.id,
    category: testCase.category,
    complexity: testCase.complexity,
    prompt: testCase.prompt,
    projectId,
    intake,
    operator,
    operatorHistory,
    status,
    runtime,
    execution,
    generatedProjectPath: projectPath,
    workspacePath: projectPath,
    evidenceArtifactId,
    buildCommand,
    runCommand: runCommandText,
    previewUrl,
    validationLogs,
    runCommandResult,
    followup,
    repair,
    localBuild,
    localTests,
    runtimeSmoke,
    capturedAt: now(),
  };

  result.score = scoreCase(result);
  return result;
}

function markdownSummary(run, summary) {
  const lines = [];
  lines.push("# Builder Forensic Run Summary");
  lines.push("");
  lines.push(`Run ID: ${run.runId}`);
  lines.push(`Mode: ${run.mode}`);
  lines.push(`Generated: ${run.generatedAt}`);
  lines.push(`API Base URL: ${run.apiBaseUrl}`);
  lines.push(`Total prompts tested: ${summary.total}`);
  lines.push(`PASS_REAL: ${summary.passReal}`);
  lines.push(`PASS_PARTIAL: ${summary.passPartial}`);
  lines.push(`BLOCKED_UNSUPPORTED: ${summary.blockedUnsupported}`);
  lines.push(`FAIL_BUILDER: ${summary.failBuilder}`);
  lines.push(`FAIL_RUNTIME: ${summary.failRuntime}`);
  lines.push(`FAIL_QUALITY: ${summary.failQuality}`);
  lines.push(`FAIL_FAKE: ${summary.failFake}`);
  lines.push(`Prompts reaching builder runtime: ${summary.reachedBuilderRuntime}`);
  lines.push(`Prompts generating artifacts/plans: ${summary.generatedArtifacts}`);
  lines.push(`Runtime build success count: ${summary.runtimeSuccess}`);
  lines.push(`Follow-up success count: ${summary.followupSuccess}`);
  lines.push(`Repair success count: ${summary.repairSuccess}`);
  lines.push(`Fake contamination count: ${summary.fakeCount}`);
  lines.push("");
  lines.push("## Category Breakdown");
  lines.push("");
  lines.push("| Category | Total | PASS_REAL | PASS_PARTIAL | Failed |");
  lines.push("|---|---:|---:|---:|---:|");
  Object.entries(summary.byCategory)
    .sort(([a], [b]) => a.localeCompare(b))
    .forEach(([category, row]) => {
      lines.push(`| ${category} | ${row.total} | ${row.passReal} | ${row.passPartial} | ${row.failed} |`);
    });
  return lines.join("\n") + "\n";
}

export async function main() {
  const corpus = buildCorpus();
  const rubric = scoringRubric();
  const selected = pickCases(corpus, MODE);
  const id = runId(MODE);
  const outDir = path.join(RUN_ROOT, id);
  await fs.mkdir(outDir, { recursive: true });

  const runMeta = {
    runId: id,
    mode: MODE,
    generatedAt: now(),
    apiBaseUrl: API_BASE_URL,
    tokenSource: process.env.BOTOMATIC_API_TOKEN ? "BOTOMATIC_API_TOKEN" : process.env.NEXT_PUBLIC_BOTOMATIC_API_TOKEN ? "NEXT_PUBLIC_BOTOMATIC_API_TOKEN" : "default-dev-api-token",
    corpusTotal: corpus.totalPrompts,
    selectedTotal: selected.length,
    rubric,
    notes: [
      "Harness uses the same intake/operator API path as control-plane chat where reachable.",
      "If API or credentials are unavailable, cases are classified BLOCKED_UNSUPPORTED with exact blocker evidence.",
      "No fake pass is emitted for unreachable runtime/build/test stages.",
    ],
  };

  const cases = [];
  for (let i = 0; i < selected.length; i += 1) {
    const testCase = selected[i];
    const runFollowup = MODE === "repair" || MODE === "100" || MODE === "200";
    const runRepair = MODE === "repair" || MODE === "200";
    const followupPrompt = [
      "make the design more premium",
      "add pricing page",
      "add auth",
      "add dashboard analytics",
      "add database-backed CRUD",
      "add email notifications",
      "add stripe subscriptions but block honestly if credentials unavailable",
      "add mobile layout",
      "fix broken build",
      "remove a feature cleanly",
    ][i % 10];

    const result = await executeCase(testCase, { runFollowup, runRepair, followupPrompt });
    cases.push(result);
    process.stdout.write(`[builder-forensic] ${i + 1}/${selected.length} ${testCase.id} => ${result.score.classification}\n`);
  }

  const summary = summarizeCases(cases);
  const run = { ...runMeta, summary, cases };

  await fs.writeFile(path.join(outDir, "run.json"), JSON.stringify(run, null, 2), "utf8");
  await fs.writeFile(path.join(outDir, "run.md"), markdownSummary(run, summary), "utf8");
  await fs.writeFile(path.join(outDir, "classification.json"), JSON.stringify(summary.byClassification, null, 2), "utf8");
  await registerRunInWindow(id, MODE);

  const latestPath = path.join(RECEIPT_ROOT, "latest-run.json");
  await fs.mkdir(RECEIPT_ROOT, { recursive: true });
  await fs.writeFile(latestPath, JSON.stringify({ runId: id, mode: MODE, path: path.relative(ROOT, outDir), generatedAt: now() }, null, 2), "utf8");

  process.stdout.write(`builder-forensic run complete: ${outDir}\n`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
