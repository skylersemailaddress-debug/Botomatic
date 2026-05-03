import fs from "fs/promises";
import fsSync from "fs";
import path from "path";
import { spawn } from "child_process";
import { buildCorpus, scoringRubric } from "./corpus.mjs";

const ROOT = process.cwd();
const RECEIPT_ROOT = path.join(ROOT, "receipts", "builder-forensic");
const RUN_ROOT = path.join(RECEIPT_ROOT, "runs");
let API_BASE_URL = "http://127.0.0.1:3001";
const TOKEN = process.env.BOTOMATIC_API_TOKEN || process.env.NEXT_PUBLIC_BOTOMATIC_API_TOKEN || "dev-api-token";
const TOKEN_SOURCE = process.env.BOTOMATIC_API_TOKEN
  ? "BOTOMATIC_API_TOKEN"
  : process.env.NEXT_PUBLIC_BOTOMATIC_API_TOKEN
    ? "NEXT_PUBLIC_BOTOMATIC_API_TOKEN"
    : "default-dev-api-token";

const allowedModes = new Set(["smoke", "100", "200", "repair", "extreme"]);

function parseMode(argv) {
  const args = argv.slice(2);

  for (let i = 0; i < args.length; i += 1) {
    const arg = String(args[i] || "").toLowerCase();
    if (arg === "--mode" && args[i + 1]) {
      const candidate = String(args[i + 1]).toLowerCase();
      if (allowedModes.has(candidate)) return candidate;
    }
    if (arg.startsWith("--mode=")) {
      const candidate = arg.slice("--mode=".length);
      if (allowedModes.has(candidate)) return candidate;
    }
  }

  for (const arg of args) {
    const candidate = String(arg || "").toLowerCase();
    if (!candidate.startsWith("--") && allowedModes.has(candidate)) return candidate;
  }

  return "smoke";
}

const MODE = parseMode(process.argv);

const modeLimit = {
  smoke: 25,
  "100": 100,
  "200": 200,
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

function pickCases(corpus, mode) {
  if (mode === "repair") {
    return corpus.items.filter(
      (item) =>
        item.category.includes("follow-up") ||
        item.category.includes("edit") ||
        item.category.includes("recovery") ||
        item.category.includes("dirty-repo")
    );
  }

  if (mode === "extreme") {
    return corpus.items.filter((item) => item.complexity === "extreme");
  }

  const limit = modeLimit[mode] || modeLimit.smoke;
  return corpus.items.slice(0, limit);
}

async function safeFetchJson(url, options = {}) {
  const { timeoutMs = 8000, retries = 1, retryDelayMs = 300, ...fetchOptions } = options;
  let lastResult = null;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const startedAt = Date.now();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, { ...fetchOptions, signal: controller.signal });
      const text = await response.text();
      let body = text;
      try {
        body = text ? JSON.parse(text) : null;
      } catch {
        // keep raw body
      }
      clearTimeout(timeout);

      const responseSnippet = toSnippet(body || text);
      const result = {
        ok: response.ok,
        status: response.status,
        latencyMs: Date.now() - startedAt,
        headers: Object.fromEntries(response.headers.entries()),
        body,
        responseSnippet,
        networkError: null,
        url,
      };
      lastResult = result;

      const retryableHttp = !response.ok && response.status >= 500;
      if (retryableHttp && attempt < retries) {
        await sleep(retryDelayMs);
        continue;
      }
      return result;
    } catch (error) {
      clearTimeout(timeout);
      const result = {
        ok: false,
        status: 0,
        latencyMs: Date.now() - startedAt,
        headers: {},
        body: null,
        responseSnippet: "",
        networkError: String(error?.message || error),
        url,
      };
      lastResult = result;

      if (attempt < retries) {
        await sleep(retryDelayMs);
        continue;
      }
      return result;
    }
  }

  return lastResult;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function toSnippet(input, maxLen = 280) {
  if (input == null) return "";
  const raw = typeof input === "string" ? input : JSON.stringify(input);
  return raw.length > maxLen ? `${raw.slice(0, maxLen)}...` : raw;
}

let apiBaseUrlResolutionPromise = null;

function normalizeBaseCandidate(candidate) {
  if (!candidate) return null;
  const raw = String(candidate || "").trim();
  if (!raw) return null;
  try {
    const parsed = new URL(raw);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
    return `${parsed.protocol}//${parsed.host}`;
  } catch {
    return null;
  }
}

function apiBaseCandidates() {
  const explicit = normalizeBaseCandidate(process.env.NEXT_PUBLIC_API_BASE_URL);
  return Array.from(new Set([explicit, "http://127.0.0.1:3001", "http://localhost:3001"].filter(Boolean)));
}

async function probeApiBase(base) {
  const attempts = [];
  const endpoints = ["/api/health", "/health"];
  for (const endpoint of endpoints) {
    const result = await safeFetchJson(`${base}${endpoint}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${TOKEN}` },
      timeoutMs: 2500,
      retries: 0,
    });
    attempts.push({
      endpoint,
      ok: result.ok,
      status: result.status,
      latencyMs: result.latencyMs,
      networkError: result.networkError,
      responseSnippet: result.responseSnippet,
      url: result.url,
    });
    if (result.ok) {
      return { ok: true, health: result, attempts };
    }
  }
  return { ok: false, health: null, attempts };
}

async function resolveApiBaseUrl() {
  if (apiBaseUrlResolutionPromise) return apiBaseUrlResolutionPromise;

  apiBaseUrlResolutionPromise = (async () => {
    const candidates = apiBaseCandidates();
    const startedAt = Date.now();
    const timeoutMs = 30000;
    const candidateAttempts = [];

    while (Date.now() - startedAt < timeoutMs) {
      for (const base of candidates) {
        const probe = await probeApiBase(base);
        candidateAttempts.push({ apiBaseUrl: base, ok: probe.ok, attempts: probe.attempts });
        if (probe.ok) {
          return {
            apiBaseUrl: base,
            health: probe.health,
            candidates,
            candidateAttempts,
          };
        }
      }
      await sleep(500);
    }

    const failed = candidateAttempts[candidateAttempts.length - 1] || {
      apiBaseUrl: candidates[0] || "http://127.0.0.1:3001",
      ok: false,
      attempts: [],
    };
    const failedAttempt = failed.attempts[failed.attempts.length - 1] || {
      status: 0,
      networkError: "unreachable",
    };
    throw new Error(
      `API preflight failed. apiBaseUrl=${failed.apiBaseUrl} status=${failedAttempt.status || 0} networkError=${failedAttempt.networkError || "none"}`
    );
  })().catch((error) => {
    apiBaseUrlResolutionPromise = null;
    throw error;
  });

  return apiBaseUrlResolutionPromise;
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

function normalizeBlockers(value) {
  if (Array.isArray(value)) return value.map((item) => String(item || "").trim()).filter(Boolean);
  if (typeof value === "string" && value.trim()) return [value.trim()];
  return [];
}

function collectCaseBlockers(caseResult) {
  const blockers = [];
  blockers.push(...normalizeBlockers(caseResult.intake?.body?.blockers));
  blockers.push(...normalizeBlockers(caseResult.operator?.body?.blockers));
  blockers.push(...normalizeBlockers(caseResult.status?.body?.blockers));
  blockers.push(...normalizeBlockers(caseResult.execution?.body?.blockers));
  if (!caseResult.intake?.ok && caseResult.intake?.status === 0 && caseResult.intake?.networkError) {
    blockers.push(`intake_network_error:${String(caseResult.intake.networkError)}`);
  }
  return Array.from(new Set(blockers));
}

function classificationReasonText(caseResult, blockers) {
  const route = String(caseResult.operator?.body?.route || "").trim();
  const direct = String(caseResult.operator?.body?.operatorMessage || "").trim();
  const intakeError = String(caseResult.intake?.networkError || "").trim();
  return [route ? `route=${route}` : "", direct, intakeError, blockers.join("; ")].filter(Boolean).join(" | ");
}

function isExplicitUnsupported(reasonText) {
  return /(illegal operation|disallowed category|impossible build|explicitly disallowed|unsupported category|policy violation)/i.test(reasonText);
}

function scoreCase(caseResult) {
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

  const workspaceExists = Boolean(caseResult.workspace?.exists);
  const runtimeBuildSuccess = Boolean(caseResult.localBuild?.ok);
  const runtimeRunSuccess = Boolean(caseResult.localRun?.ok);
  const generatedAppSmokeSuccess = Boolean(caseResult.runtimeSmoke?.ok);
  const testsGeneratedExecuted = Boolean(caseResult.localTests?.ok);
  const noPlaceholderFakeContent = !fakeSignal;
  const followupEditSuccess = Boolean(caseResult.followup?.ok);
  const repairLoopSuccess = Boolean(caseResult.repair?.ok);
  const reachedBuilderRuntime = Boolean(caseResult.intake?.ok && operatorHistory.some((entry) => entry?.ok));
  const generatedArtifacts = Boolean(
    operatorRoutes.some((route) => ["plan", "execute_next", "autonomous_complex_build", "launch_promote"].includes(route)) ||
      (caseResult.status?.body && typeof caseResult.status.body === "object" && caseResult.status.body.plan) ||
      (caseResult.execution?.body && typeof caseResult.execution.body === "object" && caseResult.execution.body.runId)
  );

  let commercialReadiness = "blocked";
  if (workspaceExists && runtimeBuildSuccess && runtimeRunSuccess && generatedAppSmokeSuccess && noPlaceholderFakeContent) commercialReadiness = "pass";
  else if (reachedBuilderRuntime) commercialReadiness = "partial";

  const blockers = collectCaseBlockers(caseResult);
  const classificationReason = classificationReasonText(caseResult, blockers);

  let classification = classifications.FAIL_QUALITY;
  if (isExplicitUnsupported(classificationReason)) classification = classifications.BLOCKED_UNSUPPORTED;
  else if (!caseResult.intake?.ok && caseResult.intake?.status === 0) classification = classifications.FAIL_BUILDER;
  else if (!caseResult.operator?.ok && caseResult.operator?.status >= 500) classification = classifications.FAIL_BUILDER;
  else if (!workspaceExists && reachedBuilderRuntime) classification = classifications.FAIL_BUILDER;
  else if (fakeSignal) classification = classifications.FAIL_FAKE;
  else if (workspaceExists && runtimeBuildSuccess && runtimeRunSuccess && generatedAppSmokeSuccess && noPlaceholderFakeContent) classification = classifications.PASS_REAL;
  else if ((workspaceExists && !runtimeBuildSuccess) || (!workspaceExists && reachedBuilderRuntime)) classification = classifications.FAIL_BUILDER;
  else if (workspaceExists && runtimeBuildSuccess && (!runtimeRunSuccess || !generatedAppSmokeSuccess)) classification = classifications.FAIL_RUNTIME;
  else if (reachedBuilderRuntime) classification = classifications.PASS_PARTIAL;
  else if (caseResult.runtimeSmoke && !caseResult.runtimeSmoke.ok) classification = classifications.FAIL_RUNTIME;

  return {
    metrics,
    checks: {
      workspaceExists,
      reachedBuilderRuntime,
      generatedArtifacts,
      runtimeBuildSuccess,
      runtimeRunSuccess,
      generatedAppSmokeSuccess,
      testsGeneratedExecuted,
      noPlaceholderFakeContent,
      followupEditSuccess,
      repairLoopSuccess,
      commercialReadiness,
    },
    classification,
    fakeSignal,
    blockers,
    classificationReason,
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

async function runShellCommand(commandText, cwd, timeoutMs = 180000) {
  return runCommand("bash", ["-lc", commandText], cwd, timeoutMs);
}

async function waitForUrl(url, timeoutMs = 15000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) return true;
    } catch {
      // keep waiting
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  return false;
}

async function runWorkspaceRuntimeSmoke(projectPath, runCommandText, smokeRoutes) {
  const port = 6100 + Math.floor(Math.random() * 1000);
  const baseUrl = `http://127.0.0.1:${port}`;

  const parts = String(runCommandText || "").trim().split(/\s+/).filter(Boolean);
  const command = parts[0] || "node";
  const args = parts.slice(1).length > 0 ? parts.slice(1) : ["server.mjs"];

  const child = spawn(command, args, {
    cwd: projectPath,
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env, PORT: String(port) },
  });

  const logs = [];
  child.stdout.on("data", (d) => logs.push(String(d)));
  child.stderr.on("data", (d) => logs.push(String(d)));

  try {
    const runOk = await waitForUrl(`${baseUrl}/health`, 15000);
    const localRun = {
      ok: runOk,
      code: runOk ? 0 : 1,
      timedOut: false,
      stdout: logs.join("").slice(0, 6000),
      stderr: runOk ? "" : "runtime health endpoint not reachable",
    };

    if (!runOk) {
      return {
        localRun,
        runtimeSmoke: {
          ok: false,
          code: 1,
          timedOut: false,
          stdout: "",
          stderr: "runtime start failed; smoke skipped",
        },
      };
    }

    const routes = Array.isArray(smokeRoutes) && smokeRoutes.length > 0 ? smokeRoutes : ["/", "/health"];
    const failures = [];
    for (const route of routes) {
      try {
        const response = await fetch(`${baseUrl}${route}`);
        if (!response.ok) failures.push(`${route}:${response.status}`);
      } catch (error) {
        failures.push(`${route}:network:${String(error?.message || error)}`);
      }
    }

    return {
      localRun,
      runtimeSmoke: {
        ok: failures.length === 0,
        code: failures.length === 0 ? 0 : 1,
        timedOut: false,
        stdout: failures.length === 0 ? `smoke ok ${routes.join(",")}` : "",
        stderr: failures.join("; "),
      },
    };
  } finally {
    if (!child.killed) {
      child.kill("SIGTERM");
    }
  }
}

async function pollForRuntimeArtifact(projectId, timeoutMs = 45000) {
  const started = Date.now();
  let latestStatus = null;
  let latestRuntime = null;
  let latestExecution = null;

  while (Date.now() - started < timeoutMs) {
    latestStatus = await safeFetchJson(`${API_BASE_URL}/api/projects/${projectId}/status`, {
      method: "GET",
      headers: { Authorization: `Bearer ${TOKEN}` },
    });
    latestRuntime = await safeFetchJson(`${API_BASE_URL}/api/projects/${projectId}/runtime`, {
      method: "GET",
      headers: { Authorization: `Bearer ${TOKEN}` },
    });
    latestExecution = await safeFetchJson(`${API_BASE_URL}/api/projects/${projectId}/execution`, {
      method: "GET",
      headers: { Authorization: `Bearer ${TOKEN}` },
    });

    const runtimePath =
      (latestRuntime?.body && typeof latestRuntime.body === "object" && (latestRuntime.body.generatedProjectPath || latestRuntime.body.workspacePath)) ||
      (latestStatus?.body && typeof latestStatus.body === "object" && (latestStatus.body.generatedProjectPath || latestStatus.body.workspacePath)) ||
      null;

    if (runtimePath) {
      return { status: latestStatus, runtime: latestRuntime, execution: latestExecution };
    }

    const jobs = latestExecution?.body && typeof latestExecution.body === "object" && Array.isArray(latestExecution.body.jobs)
      ? latestExecution.body.jobs
      : [];
    const anyTerminal = jobs.some((job) => ["failed", "blocked", "complete", "succeeded"].includes(String(job?.status || "").toLowerCase()));
    if (jobs.length > 0 && anyTerminal) {
      break;
    }

    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  return { status: latestStatus, runtime: latestRuntime, execution: latestExecution };
}

async function executeCase(testCase, options) {
  const intakePayload = {
    name: `Builder Forensic ${testCase.id}`,
    request: testCase.prompt,
  };

  const intakeUrl = `${API_BASE_URL}/api/projects/intake`;
  const intake = await safeFetchJson(intakeUrl, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(intakePayload),
  });

  let failureDiagnostic = null;
  if (!intake.ok) {
    failureDiagnostic = {
      caseId: testCase.id,
      apiBaseUrl: API_BASE_URL,
      endpointUrl: intake.url || intakeUrl,
      statusCode: intake.status,
      exceptionMessage: intake.networkError || null,
      responseBodySnippet: intake.responseSnippet || "",
      tokenSource: TOKEN_SOURCE,
    };
  }

  let operator = null;
  const operatorHistory = [];
  let status = null;
  let runtime = null;
  let execution = null;
  let followup = null;
  let repair = null;

  const projectId = intake.body && typeof intake.body === "object" ? intake.body.projectId : null;

  if (intake.ok && projectId) {
    const operatorMessages = [
      "continue current generated app build",
      "continue current generated app build",
      "continue current generated app build",
      "continue current generated app build",
    ];

    for (const message of operatorMessages) {
      const operatorUrl = `${API_BASE_URL}/api/projects/${projectId}/operator/send`;
      const response = await safeFetchJson(operatorUrl, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ message }),
      });
      operatorHistory.push(response);
      operator = response;

      if (!failureDiagnostic && !response.ok) {
        failureDiagnostic = {
          caseId: testCase.id,
          apiBaseUrl: API_BASE_URL,
          endpointUrl: response.url || operatorUrl,
          statusCode: response.status,
          exceptionMessage: response.networkError || null,
          responseBodySnippet: response.responseSnippet || "",
          tokenSource: TOKEN_SOURCE,
        };
      }

      if (!response.ok) break;
      const route = String((response.body && typeof response.body === "object" ? response.body.route : "") || "");
      if (["execute_next", "autonomous_complex_build", "launch_promote", "execute_report", "build_blocked"].includes(route)) break;
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

    const polled = await pollForRuntimeArtifact(projectId, 45000);
    status = polled.status || status;
    runtime = polled.runtime || runtime;
    execution = polled.execution || execution;

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
    (status?.body && typeof status.body === "object" && (status.body.generatedProjectPath || status.body.workspacePath || status.body.projectPath)) ||
    (runtime?.body && typeof runtime.body === "object" && (runtime.body.generatedProjectPath || runtime.body.workspacePath || runtime.body.projectPath)) ||
    null;

  const buildCommandText =
    (status?.body && typeof status.body === "object" && status.body.buildCommand) ||
    (runtime?.body && typeof runtime.body === "object" && runtime.body.buildCommand) ||
    "npm run -s build";

  const runCommandText =
    (status?.body && typeof status.body === "object" && status.body.runCommand) ||
    (runtime?.body && typeof runtime.body === "object" && runtime.body.runCommand) ||
    "node server.mjs";

  const smokeRoutes =
    (status?.body && typeof status.body === "object" && status.body.smokeRoutes) ||
    (runtime?.body && typeof runtime.body === "object" && runtime.body.smokeRoutes) ||
    ["/", "/health"];

  const workspace = {
    path: projectPath,
    exists: Boolean(projectPath && fsSync.existsSync(projectPath)),
  };

  let localBuild = null;
  let localRun = null;
  let localTests = null;
  let runtimeSmoke = null;

  if (workspace.exists && typeof projectPath === "string") {
    localBuild = await runShellCommand(buildCommandText, projectPath, 300000);
    localTests = await runCommand("npm", ["run", "-s", "test"], projectPath, 300000);
    const runtimeProof = await runWorkspaceRuntimeSmoke(projectPath, runCommandText, smokeRoutes);
    localRun = runtimeProof.localRun;
    runtimeSmoke = runtimeProof.runtimeSmoke;
  } else {
    localBuild = { ok: false, code: 1, timedOut: false, stdout: "", stderr: "workspace missing" };
    localRun = { ok: false, code: 1, timedOut: false, stdout: "", stderr: "workspace missing" };
    runtimeSmoke = { ok: false, code: 1, timedOut: false, stdout: "", stderr: "workspace missing" };
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
    followup,
    repair,
    workspace,
    localBuild,
    localRun,
    localTests,
    runtimeSmoke,
    failureDiagnostic,
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

async function main() {
  const preflight = await resolveApiBaseUrl();
  API_BASE_URL = preflight.apiBaseUrl;

  const corpus = buildCorpus();
  const rubric = scoringRubric();
  const selected = pickCases(corpus, MODE);
  process.stdout.write(`[builder-forensic] mode=${MODE}\n`);
  process.stdout.write(`[builder-forensic] apiBaseUrl=${API_BASE_URL}\n`);
  process.stdout.write(`[builder-forensic] apiBaseUrlCandidates=${JSON.stringify(preflight.candidates)}\n`);
  process.stdout.write(`[builder-forensic] apiBaseUrlAttempts=${JSON.stringify(preflight.candidateAttempts)}\n`);
  process.stdout.write(`[builder-forensic] tokenSource=${TOKEN_SOURCE}\n`);
  process.stdout.write(`[builder-forensic] apiHealth status=${preflight.health.status} latencyMs=${preflight.health.latencyMs}\n`);
  process.stdout.write(`[builder-forensic] selectedTotal=${selected.length}\n`);
  const id = runId(MODE);
  const outDir = path.join(RUN_ROOT, id);
  await fs.mkdir(outDir, { recursive: true });

  const runMeta = {
    runId: id,
    mode: MODE,
    generatedAt: now(),
    apiBaseUrl: API_BASE_URL,
    tokenSource: TOKEN_SOURCE,
    corpusTotal: corpus.totalPrompts,
    selectedTotal: selected.length,
    rubric,
    notes: [
      "Harness uses the same intake/operator API path as control-plane chat where reachable.",
      "API/credential outages are classified as FAIL_BUILDER; BLOCKED_UNSUPPORTED is reserved for explicit disallowed/impossible categories.",
      "No fake pass is emitted for unreachable runtime/build/test stages.",
    ],
  };

  const cases = [];
  let firstFailureDiagnostic = null;
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
    if (!firstFailureDiagnostic && result.failureDiagnostic) {
      firstFailureDiagnostic = result.failureDiagnostic;
      process.stdout.write(`[builder-forensic] firstFailureDiagnostic=${JSON.stringify(firstFailureDiagnostic)}\n`);
    }
    process.stdout.write(`[builder-forensic] ${i + 1}/${selected.length} ${testCase.id} => ${result.score.classification}\n`);
  }

  const summary = summarizeCases(cases);
  const run = { ...runMeta, firstFailureDiagnostic, summary, cases };

  await fs.writeFile(path.join(outDir, "run.json"), JSON.stringify(run, null, 2), "utf8");
  await fs.writeFile(path.join(outDir, "run.md"), markdownSummary(run, summary), "utf8");
  await fs.writeFile(path.join(outDir, "classification.json"), JSON.stringify(summary.byClassification, null, 2), "utf8");

  const latestPath = path.join(RECEIPT_ROOT, "latest-run.json");
  await fs.mkdir(RECEIPT_ROOT, { recursive: true });
  await fs.writeFile(latestPath, JSON.stringify({ runId: id, mode: MODE, path: path.relative(ROOT, outDir), generatedAt: now() }, null, 2), "utf8");

  process.stdout.write(`builder-forensic run complete: ${outDir}\n`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
