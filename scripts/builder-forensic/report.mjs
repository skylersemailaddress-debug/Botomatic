import fs from "fs/promises";
import path from "path";

const ROOT = process.cwd();
const RECEIPT_ROOT = path.join(ROOT, "receipts", "builder-forensic");
const RUN_ROOT = path.join(RECEIPT_ROOT, "runs");

function pct(num, den) {
  if (!den) return 0;
  return Number(((num / den) * 100).toFixed(2));
}

async function readJson(filePath) {
  const raw = await fs.readFile(filePath, "utf8");
  return JSON.parse(raw);
}

function toEpoch(input) {
  const t = Date.parse(String(input || ""));
  return Number.isFinite(t) ? t : 0;
}

function selectLatestRunsByMode(runs) {
  const targetModes = ["smoke", "100", "200", "repair", "extreme"];
  const latest = new Map();

  for (const run of runs) {
    const mode = String(run.mode || "");
    if (!targetModes.includes(mode)) continue;
    const current = latest.get(mode);
    if (!current || toEpoch(run.generatedAt) > toEpoch(current.generatedAt)) {
      latest.set(mode, run);
    }
  }

  const selected = targetModes.map((mode) => latest.get(mode)).filter(Boolean);
  return selected.length > 0 ? selected : runs;
}

function collectTopBlockers(cases) {
  const counts = new Map();
  const push = (key) => counts.set(key, (counts.get(key) || 0) + 1);

  for (const c of cases) {
    if (c.intake?.status === 0) push("API unavailable or unreachable");
    if (c.intake?.status === 401 || c.operator?.status === 401) push("Missing/invalid API auth token");
    if (!c.score?.checks?.reachedBuilderRuntime) push("Prompt did not reach builder runtime path");
    if (c.score?.checks?.reachedBuilderRuntime && !c.score?.checks?.generatedArtifacts) push("Builder did not progress to artifact/plan generation");
    if (c.score.classification === "FAIL_BUILDER") push("Builder/orchestrator internal error");
    if (!c.localBuild) push("No generated project path returned for local build validation");
    if (c.localBuild && !c.localBuild.ok) push("Generated app build command failed");
    if (c.localTests && !c.localTests.ok) push("Generated app tests failed");
    if (c.runtimeSmoke && !c.runtimeSmoke.ok) push("Runtime smoke failed");
    if (c.score.fakeSignal) push("Placeholder/fake contamination detected");
    if (!c.followup) push("Follow-up edit path not executed for this case");
    if (c.followup && !c.followup.ok) push("Follow-up edit API request failed");
    if (!c.repair) push("Repair loop not executed for this case");
    if (c.repair && !c.repair.ok) push("Repair loop replay failed");
  }

  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 10)
    .map(([blocker, count], index) => ({ rank: index + 1, blocker, count }));
}

function capabilityRows(cases) {
  const categoryMap = new Map();
  for (const c of cases) {
    const row = categoryMap.get(c.category) || {
      category: c.category,
      total: 0,
      passReal: 0,
      passPartial: 0,
      blockedUnsupported: 0,
      failBuilder: 0,
      failRuntime: 0,
      failQuality: 0,
      failFake: 0,
    };

    row.total += 1;
    if (c.score.classification === "PASS_REAL") row.passReal += 1;
    if (c.score.classification === "PASS_PARTIAL") row.passPartial += 1;
    if (c.score.classification === "BLOCKED_UNSUPPORTED") row.blockedUnsupported += 1;
    if (c.score.classification === "FAIL_BUILDER") row.failBuilder += 1;
    if (c.score.classification === "FAIL_RUNTIME") row.failRuntime += 1;
    if (c.score.classification === "FAIL_QUALITY") row.failQuality += 1;
    if (c.score.classification === "FAIL_FAKE") row.failFake += 1;

    categoryMap.set(c.category, row);
  }

  return Array.from(categoryMap.values()).sort((a, b) => a.category.localeCompare(b.category));
}

function csv(rows) {
  const header = [
    "category",
    "total",
    "pass_real",
    "pass_partial",
    "blocked_unsupported",
    "fail_builder",
    "fail_runtime",
    "fail_quality",
    "fail_fake"
  ].join(",");
  const body = rows.map((r) => [
    r.category,
    r.total,
    r.passReal,
    r.passPartial,
    r.blockedUnsupported,
    r.failBuilder,
    r.failRuntime,
    r.failQuality,
    r.failFake,
  ].join(","));
  return [header, ...body].join("\n") + "\n";
}

function verdict(summary) {
  if (summary.fakeContaminationRate > 0) return "FAIL_PRIVATE_BETA";
  if (summary.passRate >= 70 && summary.runtimeSuccessRate >= 60) return "PASS_PRIVATE_BETA";
  if (summary.passPlusPartialRate >= 60) return "PARTIAL_PRIVATE_BETA";
  return "FAIL_PRIVATE_BETA";
}

function answer99(summary) {
  if (summary.passRate >= 99) {
    return "No. Even with high measured pass rate, this harness forbids claiming 99% coverage without broader external/runtime/deployment proof.";
  }
  return `No. Measured PASS_REAL rate is ${summary.passRate}% and PASS_REAL+PASS_PARTIAL is ${summary.passPlusPartialRate}%, below a defensible 99% claim.`;
}

function mdReport(summary, blockers, rows) {
  const lines = [];
  lines.push("# Builder Forensic Capability Report");
  lines.push("");
  lines.push(`Generated: ${summary.generatedAt}`);
  lines.push(`Total prompts tested: ${summary.totalPromptsTested}`);
  lines.push(`Categories covered: ${summary.categoriesCovered}`);
  lines.push(`PASS_REAL rate: ${summary.passRate}%`);
  lines.push(`PASS_REAL + PASS_PARTIAL rate: ${summary.passPlusPartialRate}%`);
  lines.push(`Prompts reaching builder runtime: ${summary.promptsReachedBuilderRuntime}`);
  lines.push(`Prompts generating artifacts/plans: ${summary.promptsGeneratedArtifacts}`);
  lines.push(`Built successfully: ${summary.builtSuccessfully}`);
  lines.push(`Ran successfully: ${summary.ranSuccessfully}`);
  lines.push(`Repaired successfully: ${summary.repairedSuccessfully}`);
  lines.push(`Fail rate: ${summary.failRate}%`);
  lines.push(`Unsupported rate: ${summary.unsupportedRate}%`);
  lines.push(`Runtime success rate: ${summary.runtimeSuccessRate}%`);
  lines.push(`Follow-up edit success rate: ${summary.followupSuccessRate}%`);
  lines.push(`Repair success rate: ${summary.repairSuccessRate}%`);
  lines.push(`Fake contamination rate: ${summary.fakeContaminationRate}%`);
  lines.push(`Owner verdict: ${summary.ownerVerdict}`);
  lines.push("");
  lines.push("## 99% Claim Test");
  lines.push("");
  lines.push(summary.answer99Percent);
  lines.push("");
  lines.push("## Top 10 Blockers");
  lines.push("");
  blockers.forEach((b) => lines.push(`${b.rank}. ${b.blocker} (${b.count})`));
  lines.push("");
  lines.push("## Category Capability Matrix");
  lines.push("");
  lines.push("| Category | Total | PASS_REAL | PASS_PARTIAL | BLOCKED_UNSUPPORTED | FAIL_BUILDER | FAIL_RUNTIME | FAIL_QUALITY | FAIL_FAKE |");
  lines.push("|---|---:|---:|---:|---:|---:|---:|---:|---:|");
  rows.forEach((r) => {
    lines.push(`| ${r.category} | ${r.total} | ${r.passReal} | ${r.passPartial} | ${r.blockedUnsupported} | ${r.failBuilder} | ${r.failRuntime} | ${r.failQuality} | ${r.failFake} |`);
  });

  return lines.join("\n") + "\n";
}

function closureWorkFor(blocker) {
  if (blocker === "Prompt did not reach builder runtime path") {
    return "Auto-run spec analyze/build-contract approval sequence before planning and dispatch; add regression test for compile->plan->execute transition.";
  }
  if (blocker === "Builder did not progress to artifact/plan generation") {
    return "Patch orchestration step routing to force plan generation and dispatch/execute-next when contract is ready; add runtime orchestration integration test.";
  }
  if (blocker === "No generated project path returned for local build validation") {
    return "Persist generated artifact workspace path in project status/runtime payload and consume it in forensic harness for local build/smoke probes.";
  }
  if (blocker === "Repair loop replay failed") {
    return "Enable repair replay preconditions in harness (governance approvals and repairable packet state), then add regression test for replay success path.";
  }
  if (blocker === "Follow-up edit API request failed") {
    return "Harden follow-up prompts and role/auth context for operator route; add regression test asserting 2xx follow-up responses for edit corpus cases.";
  }
  if (blocker === "API unavailable or unreachable") {
    return "Add preflight server boot+health check gate and fail-fast before corpus execution if API/UI endpoints are down.";
  }
  return "Implement targeted builder/runtime support and add regression tests for this failure class.";
}

async function main() {
  await fs.mkdir(RECEIPT_ROOT, { recursive: true });

  let runDirs = [];
  try {
    runDirs = (await fs.readdir(RUN_ROOT, { withFileTypes: true }))
      .filter((entry) => entry.isDirectory())
      .map((entry) => path.join(RUN_ROOT, entry.name));
  } catch {
    runDirs = [];
  }

  const runs = [];
  for (const dir of runDirs) {
    const runPath = path.join(dir, "run.json");
    try {
      runs.push(await readJson(runPath));
    } catch {
      // skip invalid run payloads
    }
  }

  if (runs.length === 0) {
    const empty = {
      generatedAt: new Date().toISOString(),
      totalPromptsTested: 0,
      categoriesCovered: 0,
      note: "No forensic run receipts found. Execute smoke/100/200/repair runs first.",
    };
    await fs.writeFile(path.join(RECEIPT_ROOT, "summary.json"), JSON.stringify(empty, null, 2), "utf8");
    await fs.writeFile(path.join(RECEIPT_ROOT, "summary.md"), "# Builder Forensic Summary\n\nNo runs available.\n", "utf8");
    process.stdout.write("No runs found; wrote empty summary.\n");
    return;
  }

  const selectedRuns = selectLatestRunsByMode(runs);
  const allCases = selectedRuns.flatMap((run) => run.cases || []);
  const rows = capabilityRows(allCases);
  const blockers = collectTopBlockers(allCases);

  const passReal = allCases.filter((c) => c.score.classification === "PASS_REAL").length;
  const passPartial = allCases.filter((c) => c.score.classification === "PASS_PARTIAL").length;
  const failCount = allCases.filter((c) => c.score.classification.startsWith("FAIL")).length;
  const unsupportedCount = allCases.filter((c) => c.score.classification === "BLOCKED_UNSUPPORTED").length;
  const promptsReachedBuilderRuntime = allCases.filter((c) => c.score.checks.reachedBuilderRuntime).length;
  const promptsGeneratedArtifacts = allCases.filter((c) => c.score.checks.generatedArtifacts).length;
  const builtSuccessfully = allCases.filter((c) => c.score.checks.runtimeBuildSuccess).length;
  const ranSuccessfully = allCases.filter((c) => c.score.checks.generatedAppSmokeSuccess).length;
  const repairedSuccessfully = allCases.filter((c) => c.score.checks.repairLoopSuccess).length;
  const runtimeSuccess = builtSuccessfully;
  const followupSuccess = allCases.filter((c) => c.score.checks.followupEditSuccess).length;
  const repairSuccess = repairedSuccessfully;
  const fakeCount = allCases.filter((c) => c.score.fakeSignal).length;

  const summary = {
    generatedAt: new Date().toISOString(),
    runsIncluded: selectedRuns.map((run) => ({ runId: run.runId, mode: run.mode, selectedTotal: run.selectedTotal })),
    allRunsDiscovered: runs.map((run) => ({ runId: run.runId, mode: run.mode, selectedTotal: run.selectedTotal })),
    totalPromptsTested: allCases.length,
    categoriesCovered: new Set(allCases.map((c) => c.category)).size,
    passRate: pct(passReal, allCases.length),
    passPlusPartialRate: pct(passReal + passPartial, allCases.length),
    promptsReachedBuilderRuntime,
    promptsGeneratedArtifacts,
    builtSuccessfully,
    ranSuccessfully,
    repairedSuccessfully,
    failRate: pct(failCount, allCases.length),
    unsupportedRate: pct(unsupportedCount, allCases.length),
    runtimeSuccessRate: pct(runtimeSuccess, allCases.length),
    followupSuccessRate: pct(followupSuccess, allCases.length),
    repairSuccessRate: pct(repairSuccess, allCases.length),
    fakeContaminationRate: pct(fakeCount, allCases.length),
    ownerVerdict: "",
    answer99Percent: "",
    whatHandlesWell: rows.filter((r) => r.passReal > 0).map((r) => r.category),
    whatHandlesPartially: rows.filter((r) => r.passPartial > 0).map((r) => r.category),
    whatFails: rows.filter((r) => r.failBuilder + r.failRuntime + r.failQuality + r.failFake > 0).map((r) => r.category),
    topBlockers: blockers,
  };

  summary.ownerVerdict = verdict(summary);
  summary.answer99Percent = answer99(summary);

  const claimBoundary = {
    generatedAt: summary.generatedAt,
    claim: "Can Botomatic build 99% of apps for real?",
    answer: summary.answer99Percent,
    boundary: "This report reflects corpus/harness evidence only. It does not imply live production deployment proof for unsupported or unexecuted provider integrations.",
  };

  const blockerMd = [
    "# Top Blockers To 99%",
    "",
    ...blockers.map((b) => `${b.rank}. ${b.blocker}`),
    "",
    "## Closure Work",
    "",
    ...blockers.map((b) => `${b.rank}. ${b.blocker}: ${closureWorkFor(b.blocker)}`),
    "",
  ].join("\n");

  await fs.writeFile(path.join(RECEIPT_ROOT, "summary.json"), JSON.stringify(summary, null, 2), "utf8");
  await fs.writeFile(path.join(RECEIPT_ROOT, "summary.md"), mdReport(summary, blockers, rows), "utf8");
  await fs.writeFile(path.join(RECEIPT_ROOT, "capability-matrix.csv"), csv(rows), "utf8");
  await fs.writeFile(path.join(RECEIPT_ROOT, "top-blockers.md"), blockerMd, "utf8");
  await fs.writeFile(path.join(RECEIPT_ROOT, "claim-boundary.md"), `${claimBoundary.claim}\n\n${claimBoundary.answer}\n\n${claimBoundary.boundary}\n`, "utf8");

  process.stdout.write(`builder-forensic report written to ${RECEIPT_ROOT}\n`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
