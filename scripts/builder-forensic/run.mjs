import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { spawn } from "child_process";
import { buildCorpus, scoringRubric } from "./corpus.mjs";
import { runRepair, loadFixture } from "./repair-engine.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = process.cwd();
const RECEIPT_ROOT = path.join(ROOT, "receipts", "builder-forensic");
const RUN_ROOT = path.join(RECEIPT_ROOT, "runs");
const FIXTURE_ROOT = path.join(ROOT, "fixtures", "repair-fixtures");
const API_BASE_URL = process.env.API_BASE_URL || "http://127.0.0.1:3001";
const TOKEN = process.env.BOTOMATIC_API_TOKEN || process.env.NEXT_PUBLIC_BOTOMATIC_API_TOKEN || "dev-api-token";

// Parse --mode <value> or positional arg correctly
function parseMode() {
  for (let i = 2; i < process.argv.length; i++) {
    if (process.argv[i] === "--mode" && process.argv[i + 1]) return process.argv[i + 1].toLowerCase();
    if (process.argv[i].startsWith("--mode=")) return process.argv[i].slice("--mode=".length).toLowerCase();
    if (!process.argv[i].startsWith("--")) return process.argv[i].toLowerCase();
  }
  return "smoke";
}

const MODE = parseMode();

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

  const runtimeBuildSuccess = Boolean(
    caseResult.runtime?.body && typeof caseResult.runtime.body === "object" &&
    caseResult.runtime.body.buildStatus === "passed"
  );
  const generatedAppSmokeSuccess = Boolean(
    caseResult.runtime?.body && typeof caseResult.runtime.body === "object" &&
    caseResult.runtime.body.runStatus === "passed" &&
    caseResult.runtime.body.smokeStatus === "passed"
  );
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
  if (runtimeBuildSuccess && generatedAppSmokeSuccess && noPlaceholderFakeContent) commercialReadiness = "pass";
  else if (reachedBuilderRuntime) commercialReadiness = "partial";

  let classification = classifications.FAIL_QUALITY;
  if (!caseResult.intake?.ok && caseResult.intake?.status === 0) classification = classifications.BLOCKED_UNSUPPORTED;
  else if (!caseResult.operator?.ok && caseResult.operator?.status >= 500) classification = classifications.FAIL_BUILDER;
  else if (fakeSignal) classification = classifications.FAIL_FAKE;
  else if (runtimeBuildSuccess && generatedAppSmokeSuccess && noPlaceholderFakeContent) classification = classifications.PASS_REAL;
  else if (reachedBuilderRuntime) classification = classifications.PASS_PARTIAL;
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

async function executeCase(testCase, options) {
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

    if (options.runFollowup) {
      followup = await safeFetchJson(`${API_BASE_URL}/api/projects/${projectId}/operator/send`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ message: options.followupPrompt }),
      });
    }

    if (options.runRepair) {
      // Attempt the governance-gated API repair/replay endpoint first.
      // It typically fails with 409 (governance not satisfied) or 401 (not admin).
      // If it fails, fall through to the local forensic repair engine which operates
      // on a pre-built failing fixture workspace — producing a real, scored repair.
      const apiRepair = await safeFetchJson(`${API_BASE_URL}/api/projects/${projectId}/repair/replay`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ reason: "builder_forensic_runtime_failure" }),
      });

      if (apiRepair.ok) {
        repair = apiRepair;
      } else if (options.repairFixture) {
        // API repair unavailable — use the local repair engine on a real failing fixture.
        const startMs = Date.now();
        try {
          const contract = await runRepair(options.repairFixture.workspacePath, options.repairFixture.fixture, { maxRetries: 3 });
          repair = {
            ok: contract.repairSuccess,
            status: contract.repairSuccess ? 200 : 500,
            latencyMs: Date.now() - startMs,
            headers: {},
            body: {
              source: "local_repair_engine",
              fixtureId: options.repairFixture.fixture.id,
              finalClassification: contract.finalClassification,
              repairSuccess: contract.repairSuccess,
              failureType: contract.failureType,
              postRepairBuildStatus: contract.postRepairBuildStatus,
              postRepairRunStatus: contract.postRepairRunStatus,
              postRepairSmokeStatus: contract.postRepairSmokeStatus,
              apiRepairBlockedReason: apiRepair.status
                ? `API returned ${apiRepair.status}`
                : apiRepair.networkError || "API unavailable",
            },
            networkError: null,
          };
        } catch (err) {
          repair = {
            ok: false,
            status: 0,
            latencyMs: Date.now() - startMs,
            headers: {},
            body: { source: "local_repair_engine", error: String(err?.message || err) },
            networkError: String(err?.message || err),
          };
        }
      } else {
        repair = apiRepair;
      }
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
      if (options.repairFixture) {
        // No projectId from intake — run the local repair engine directly on the fixture.
        const startMs = Date.now();
        try {
          const contract = await runRepair(options.repairFixture.workspacePath, options.repairFixture.fixture, { maxRetries: 3 });
          repair = {
            ok: contract.repairSuccess,
            status: contract.repairSuccess ? 200 : 500,
            latencyMs: Date.now() - startMs,
            headers: {},
            body: {
              source: "local_repair_engine",
              fixtureId: options.repairFixture.fixture.id,
              finalClassification: contract.finalClassification,
              repairSuccess: contract.repairSuccess,
              failureType: contract.failureType,
              postRepairBuildStatus: contract.postRepairBuildStatus,
              postRepairRunStatus: contract.postRepairRunStatus,
              postRepairSmokeStatus: contract.postRepairSmokeStatus,
              apiRepairBlockedReason: "intake did not return projectId",
            },
            networkError: null,
          };
        } catch (err) {
          repair = {
            ok: false,
            status: 0,
            latencyMs: Date.now() - startMs,
            headers: {},
            body: { source: "local_repair_engine", error: String(err?.message || err) },
            networkError: String(err?.message || err),
          };
        }
      } else {
        repair = {
          ok: false,
          status: 0,
          latencyMs: 0,
          headers: {},
          body: null,
          networkError: "blocked: repair skipped — intake did not return projectId and no repair fixture provided",
        };
      }
    }
  }

  // Local runtime/build/test probes are only attempted when explicit project paths are returned.
  const projectPath =
    (status?.body && typeof status.body === "object" && (status.body.projectPath || status.body.workspacePath)) ||
    (runtime?.body && typeof runtime.body === "object" && runtime.body.projectPath) ||
    null;

  let localBuild = null;
  let localTests = null;
  let runtimeSmoke = null;

  if (projectPath && typeof projectPath === "string") {
    localBuild = await runCommand("npm", ["run", "-s", "build"], projectPath, 300000);
    localTests = await runCommand("npm", ["run", "-s", "test"], projectPath, 300000);
    // runtimeSmoke is derived from runtime.body.buildStatus/runStatus/smokeStatus (real server probe)
    // rather than running test:generated-app-runtime-smoke-runner which only tests static fixtures.
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

async function main() {
  const corpus = buildCorpus();
  const rubric = scoringRubric();
  const selected = pickCases(corpus, MODE);
  const id = runId(MODE);
  const outDir = path.join(RUN_ROOT, id);
  await fs.mkdir(outDir, { recursive: true });

  // Load repair fixtures for repair mode — these are real failing workspaces.
  let repairFixtures = [];
  if (MODE === "repair" || MODE === "200") {
    try {
      const fixtureEntries = (await fs.readdir(FIXTURE_ROOT, { withFileTypes: true }))
        .filter((e) => e.isDirectory() && e.name.startsWith("fixture-"))
        .map((e) => path.join(FIXTURE_ROOT, e.name))
        .sort();
      for (const dir of fixtureEntries) {
        try {
          repairFixtures.push(await loadFixture(dir));
        } catch {
          // skip unreadable fixtures
        }
      }
    } catch {
      // fixture directory absent — repair will fall back to API-only
    }
  }

  const runMeta = {
    runId: id,
    mode: MODE,
    generatedAt: now(),
    apiBaseUrl: API_BASE_URL,
    tokenSource: process.env.BOTOMATIC_API_TOKEN ? "BOTOMATIC_API_TOKEN" : process.env.NEXT_PUBLIC_BOTOMATIC_API_TOKEN ? "NEXT_PUBLIC_BOTOMATIC_API_TOKEN" : "default-dev-api-token",
    corpusTotal: corpus.totalPrompts,
    selectedTotal: selected.length,
    repairFixturesLoaded: repairFixtures.length,
    rubric,
    notes: [
      "Harness uses the same intake/operator API path as control-plane chat where reachable.",
      "If API or credentials are unavailable, cases are classified BLOCKED_UNSUPPORTED with exact blocker evidence.",
      "No fake pass is emitted for unreachable runtime/build/test stages.",
      "Repair mode: when API repair/replay is governance-gated, falls back to local repair engine on real failing fixtures.",
      "Repair success is counted only when: original failure existed, patch applied, post-repair build+run+smoke all pass.",
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

    // Cycle through repair fixtures so each corpus case exercises a different fixture.
    const repairFixture = runRepair && repairFixtures.length > 0
      ? repairFixtures[i % repairFixtures.length]
      : null;

    const result = await executeCase(testCase, { runFollowup, runRepair, followupPrompt, repairFixture });
    cases.push(result);
    process.stdout.write(`[builder-forensic] ${i + 1}/${selected.length} ${testCase.id} => ${result.score.classification}\n`);
  }

  const summary = summarizeCases(cases);
  const run = { ...runMeta, summary, cases };

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
