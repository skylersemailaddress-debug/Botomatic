/**
 * End-to-end integration test for the generic mission pipeline.
 *
 * Tests the full chain: spec → compile → claim boundary → wave planning →
 * checkpoint → resume → commercial readiness gates.
 *
 * Does NOT require a running API server — exercises the pipeline modules directly.
 */
import fs from "fs";
import os from "os";
import path from "path";
import { compileSpecToMission } from "../specToMissionCompiler.js";
import { buildContractFromSpec, canExecuteMission, lockContract } from "../missionContract.js";
import { evaluateMissionClaim, checkClaimBoundary, formatClaimBoundaryReport } from "../missionClaimBoundary.js";
import { planWaves, validateWaveDependencies, canWaveRun } from "../wavePlanner.js";
import { saveCheckpoint, loadCheckpoint } from "../missionRunner.js";
import { getMissionProgress, formatUserFacingStatus } from "../missionStages.js";
import { detectTargetArchitecture, detectProductType } from "../missionTargets.js";
import { getProofRules, detectWaveType } from "../waveProofRules.js";
import { ENTERPRISE_SAAS_SPEC, ENTERPRISE_SAAS_PROJECT_ID } from "../fixtures/enterprise-saas.js";
import { MARKETPLACE_SPEC, MARKETPLACE_PROJECT_ID } from "../fixtures/marketplace.js";
import { NEXUS_BENCHMARK_SPEC, NEXUS_BENCHMARK_PROJECT_ID } from "../fixtures/nexus.js";
import type { Mission } from "../missionModel.js";

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string): void {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failed++;
  }
}

function assertDeepEqual<T>(actual: T, expected: T, label: string): void {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  assert(ok, `${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function proveAllWaves(mission: Mission): Mission {
  const now = new Date().toISOString();
  return {
    ...mission,
    status: "proven",
    provenWaves: mission.waves.length,
    claimLevel: "SYSTEM_LAUNCH_READY",
    waves: mission.waves.map((w) => ({ ...w, status: "proven", provenAt: now })),
  };
}

function proveWaves(mission: Mission, waveIds: string[]): Mission {
  const now = new Date().toISOString();
  const ids = new Set(waveIds);
  const provenCount = mission.waves.filter((w) => ids.has(w.waveId)).length;
  const updated = {
    ...mission,
    status: "in_progress" as const,
    provenWaves: provenCount,
    waves: mission.waves.map((w) =>
      ids.has(w.waveId) ? { ...w, status: "proven" as const, provenAt: now } : w
    ),
  };
  return { ...updated, claimLevel: evaluateMissionClaim(updated) };
}

// ── Test Suite ───────────────────────────────────────────────────────────────

async function runTests(): Promise<void> {

  // ── [E2E-1] Deterministic compilation across fixtures ─────────────────────
  console.log("\n[E2E-1] Deterministic compilation — same input always same specHash");
  {
    const fixtures = [
      { spec: ENTERPRISE_SAAS_SPEC, file: "enterprise-saas.md", id: ENTERPRISE_SAAS_PROJECT_ID },
      { spec: MARKETPLACE_SPEC, file: "marketplace.md", id: MARKETPLACE_PROJECT_ID },
      { spec: NEXUS_BENCHMARK_SPEC, file: "nexus.md", id: NEXUS_BENCHMARK_PROJECT_ID },
    ];
    for (const f of fixtures) {
      const r1 = compileSpecToMission({ specText: f.spec, sourceFile: f.file, projectId: f.id });
      const r2 = compileSpecToMission({ specText: f.spec, sourceFile: f.file, projectId: f.id });
      assert(r1.specHash === r2.specHash, `${f.id}: deterministic specHash`);
      assert(r1.mission.missionId === r2.mission.missionId, `${f.id}: deterministic missionId`);
      assert(r1.waveCount >= 5, `${f.id}: at least 5 waves (got ${r1.waveCount})`);
      assert(r1.mission.claimLevel === "MISSION_COMPILED", `${f.id}: starts at MISSION_COMPILED`);
    }
  }

  // ── [E2E-2] All waves have waveType set ───────────────────────────────────
  console.log("\n[E2E-2] All compiled waves have waveType set");
  {
    const r = compileSpecToMission({ specText: ENTERPRISE_SAAS_SPEC, sourceFile: "ent.md", projectId: "e2e_type_test" });
    for (const w of r.mission.waves) {
      assert(typeof w.waveType === "string" && w.waveType.length > 0, `wave ${w.waveId} has waveType`);
      assert(w.waveType === w.waveId, `wave ${w.waveId} waveType matches waveId`);
    }
  }

  // ── [E2E-3] Dependency graph is valid and cycle-free ─────────────────────
  console.log("\n[E2E-3] Dependency graph validation — no cycles, no unknown deps");
  {
    for (const { spec, id } of [
      { spec: ENTERPRISE_SAAS_SPEC, id: "ent" },
      { spec: MARKETPLACE_SPEC, id: "mkt" },
      { spec: NEXUS_BENCHMARK_SPEC, id: "nex" },
    ]) {
      const r = compileSpecToMission({ specText: spec, sourceFile: `${id}.md`, projectId: id });
      const validation = validateWaveDependencies(r.mission.waves);
      assert(validation.valid, `${id}: dependency graph is valid (no cycles, no unknown deps)`);
      assert(validation.errors.length === 0, `${id}: no dependency errors`);
      assert(validation.circularPaths.length === 0, `${id}: no circular dependencies`);
    }
  }

  // ── [E2E-4] Wave planner topological ordering ─────────────────────────────
  console.log("\n[E2E-4] Wave planner produces correct topological order");
  {
    const r = compileSpecToMission({ specText: ENTERPRISE_SAAS_SPEC, sourceFile: "ent.md", projectId: "e2e_topo" });
    const { orderedWaves, readyWaves, blockedWaves } = planWaves(r.mission);

    assert(orderedWaves.length === r.mission.waves.length, "all waves in topological order");

    // No wave should appear before its dependencies
    const positionOf = new Map(orderedWaves.map((w, i) => [w.waveId, i]));
    for (const w of orderedWaves) {
      for (const dep of w.dependsOn) {
        const depPos = positionOf.get(dep) ?? -1;
        const wPos = positionOf.get(w.waveId) ?? -1;
        assert(depPos < wPos, `dep "${dep}" appears before "${w.waveId}" in topological order`);
      }
    }

    // Fresh mission: only waves with no dependencies are ready
    const noDepWaves = r.mission.waves.filter((w) => w.dependsOn.length === 0);
    assert(readyWaves.length === noDepWaves.length, `${noDepWaves.length} wave(s) ready on fresh mission`);
    assert(blockedWaves.length > 0, "blocked waves exist on fresh mission");
  }

  // ── [E2E-5] Claim boundary ladder — step by step ─────────────────────────
  console.log("\n[E2E-5] Claim boundary ladder advances correctly as waves proven");
  {
    const r = compileSpecToMission({ specText: ENTERPRISE_SAAS_SPEC, sourceFile: "ent.md", projectId: "e2e_ladder" });
    const waveIds = r.mission.waves.map((w) => w.waveId);

    // Fresh mission
    assert(evaluateMissionClaim(r.mission) === "MISSION_COMPILED", "fresh: MISSION_COMPILED");
    assert(!checkClaimBoundary(r.mission, "WAVE_PROVEN").allowed, "fresh: cannot claim WAVE_PROVEN");
    assert(!checkClaimBoundary(r.mission, "SYSTEM_LAUNCH_READY").allowed, "fresh: cannot claim SYSTEM_LAUNCH_READY");

    // One wave proven
    const oneProven = proveWaves(r.mission, [waveIds[0]]);
    const afterOne = evaluateMissionClaim(oneProven);
    assert(
      afterOne === "SYSTEM_PARTIAL" || afterOne === "WAVE_PROVEN",
      `one wave proven: claim is SYSTEM_PARTIAL or WAVE_PROVEN (got ${afterOne})`
    );

    // Core infra proven
    const coreWaveIds = waveIds.filter((id) => ["repo_layout", "api_schema", "builder_factory"].includes(id));
    if (coreWaveIds.length >= 2) {
      const coreProven = proveWaves(r.mission, coreWaveIds);
      const afterCore = evaluateMissionClaim(coreProven);
      assert(
        ["SYSTEM_BUILDABLE", "SYSTEM_PARTIAL", "WAVE_PROVEN"].includes(afterCore),
        `core proven: claim >= SYSTEM_PARTIAL (got ${afterCore})`
      );
    }

    // All waves proven
    const allProven = proveAllWaves(r.mission);
    assert(evaluateMissionClaim(allProven) === "SYSTEM_LAUNCH_READY", "all proven: SYSTEM_LAUNCH_READY");
    assert(checkClaimBoundary(allProven, "SYSTEM_LAUNCH_READY").allowed, "all proven: can claim SYSTEM_LAUNCH_READY");
    assert(checkClaimBoundary(allProven, "MISSION_COMPILED").allowed, "all proven: can still claim MISSION_COMPILED");
  }

  // ── [E2E-6] Claim boundary is monotone — no false promotions ─────────────
  console.log("\n[E2E-6] Claim boundary is monotone — higher levels require more proof");
  {
    const r = compileSpecToMission({ specText: MARKETPLACE_SPEC, sourceFile: "mkt.md", projectId: "e2e_mono" });
    const levels = ["MISSION_COMPILED", "WAVE_READY", "WAVE_PROVEN", "SYSTEM_PARTIAL", "SYSTEM_BUILDABLE", "SYSTEM_RUNTIME_PROVEN", "SYSTEM_LAUNCH_READY"] as const;

    // Once all waves proven, ALL levels should be allowed
    const allProven = proveAllWaves(r.mission);
    for (const level of levels) {
      assert(checkClaimBoundary(allProven, level).allowed, `all proven: ${level} allowed`);
    }

    // With no waves proven, only MISSION_COMPILED allowed
    for (const level of levels) {
      const result = checkClaimBoundary(r.mission, level);
      if (level === "MISSION_COMPILED") {
        assert(result.allowed, "fresh: MISSION_COMPILED allowed");
      } else if (level === "WAVE_READY" || level === "WAVE_PROVEN") {
        assert(!result.allowed, `fresh: ${level} blocked`);
      }
    }
  }

  // ── [E2E-7] Claim report contains no Nexus-specific wave IDs for generic missions
  console.log("\n[E2E-7] Claim report for generic mission has no Nexus-specific wave IDs");
  {
    const r = compileSpecToMission({ specText: MARKETPLACE_SPEC, sourceFile: "mkt.md", projectId: "e2e_no_nexus" });
    const report = formatClaimBoundaryReport(r.mission);
    const nexusOnlyIds = ["repair_replay", "truth_memory", "intelligence_shell"];
    // These should NOT appear as required unless they're in the actual wave list
    const waveIds = new Set(r.mission.waves.map((w) => w.waveId));
    for (const nexusId of nexusOnlyIds) {
      if (!waveIds.has(nexusId)) {
        assert(!report.includes(nexusId), `report does not mention absent Nexus wave "${nexusId}"`);
      }
    }
  }

  // ── [E2E-8] Checkpoint save + load preserves all state ───────────────────
  console.log("\n[E2E-8] Checkpoint save/load preserves full mission state");
  {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "e2e-checkpoint-"));
    try {
      const r = compileSpecToMission({ specText: ENTERPRISE_SAAS_SPEC, sourceFile: "ent.md", projectId: "e2e_checkpoint" });
      const config = { checkpointDir: tmpDir, apiBaseUrl: "http://localhost:3001", apiToken: "test" };

      // Save and reload fresh mission
      await saveCheckpoint(r.mission, config);
      const loaded = await loadCheckpoint(tmpDir);
      assert(loaded !== null, "checkpoint loads successfully");
      assert(loaded!.missionId === r.mission.missionId, "missionId preserved");
      assert(loaded!.waves.length === r.mission.waves.length, "wave count preserved");
      assert(loaded!.claimLevel === "MISSION_COMPILED", "claimLevel preserved");
      assert(loaded!.provenWaves === 0, "provenWaves preserved (0)");

      // Prove a wave and save again
      const now = new Date().toISOString();
      const withProven: Mission = {
        ...r.mission,
        provenWaves: 1,
        waves: r.mission.waves.map((w, i) =>
          i === 0 ? { ...w, status: "proven", provenAt: now } : w
        ),
      };
      await saveCheckpoint(withProven, config);
      const loaded2 = await loadCheckpoint(tmpDir);
      assert(loaded2!.provenWaves === 1, "provenWaves=1 preserved after update");
      assert(loaded2!.waves[0].status === "proven", "proven wave status preserved");
      assert(loaded2!.waves.slice(1).every((w) => w.status === "pending"), "unproven waves still pending");
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  }

  // ── [E2E-9] Contract locks and blocks correctly ───────────────────────────
  console.log("\n[E2E-9] Mission contract locks and execution gates work end-to-end");
  {
    const r = compileSpecToMission({ specText: ENTERPRISE_SAAS_SPEC, sourceFile: "ent.md", projectId: "e2e_contract" });

    // Build contract with blocking questions
    const contractBlocked = buildContractFromSpec({
      missionId: r.mission.missionId,
      projectId: "e2e_contract",
      sourceSpecHash: r.sourceHash,
      sourceType: "text",
      productType: r.productType,
      targetArchitecture: r.targetArchitecture,
      detectedCapabilities: ["auth", "payments"],
      requiredWaves: r.mission.waves.map((w) => w.waveId),
      unresolvedQuestions: [
        { id: "q_auth", field: "auth", question: "Which auth provider?", risk: "high", blocking: true },
      ],
      assumptions: [],
      excludedScope: [],
      acceptanceCriteria: ["tests pass"],
    });

    const blockedResult = canExecuteMission(contractBlocked);
    assert(!blockedResult.allowed, "contract with blocking questions: blocked");
    assert(blockedResult.reason.includes("high-risk"), "block reason mentions high-risk");
    assert(contractBlocked.blockers.length > 0, "blockers array populated");

    // Cannot lock contract with blocking questions
    let lockThrew = false;
    try { lockContract(contractBlocked, "test"); } catch { lockThrew = true; }
    assert(lockThrew, "lockContract throws on blocking questions");

    // Build clean contract
    const contractClean = buildContractFromSpec({
      missionId: r.mission.missionId,
      projectId: "e2e_contract_clean",
      sourceSpecHash: r.sourceHash,
      sourceType: "text",
      productType: r.productType,
      targetArchitecture: r.targetArchitecture,
      detectedCapabilities: [],
      requiredWaves: r.mission.waves.map((w) => w.waveId),
      unresolvedQuestions: [],
      assumptions: [
        { id: "a_email", field: "email_provider", decision: "Use Resend", reason: "Low-risk default", risk: "low", autoDecided: true },
      ],
      excludedScope: [],
      acceptanceCriteria: ["tests pass"],
    });

    const notYetApproved = canExecuteMission(contractClean);
    assert(!notYetApproved.allowed, "clean contract: blocked until approved");

    const locked = lockContract(contractClean, "system");
    assert(locked.userApproved, "locked contract is approved");
    assert(!!locked.lockedAt, "locked contract has lockedAt timestamp");
    assert(!!locked.approvedAt, "locked contract has approvedAt timestamp");
    assert(locked.lockedSpecVersion.length > 0, "locked contract has lockedSpecVersion");

    const afterLock = canExecuteMission(locked);
    assert(afterLock.allowed, "locked contract: execution allowed");
  }

  // ── [E2E-10] User-facing stage progression ────────────────────────────────
  console.log("\n[E2E-10] User stage progression maps correctly to mission state");
  {
    const r = compileSpecToMission({ specText: MARKETPLACE_SPEC, sourceFile: "mkt.md", projectId: "e2e_stages" });

    // Pre-mission
    const preProgress = getMissionProgress(null, null);
    assert(preProgress.stage === "understanding_spec", "null mission: understanding_spec");

    // Compiled, no contract
    const compiled = getMissionProgress(r.mission, null);
    assert(typeof compiled.stage === "string" && compiled.stage.length > 0, "compiled: stage set");
    assert(typeof compiled.percentComplete === "number", "compiled: percentComplete is number");
    assert(compiled.percentComplete >= 0 && compiled.percentComplete <= 100, "compiled: percentComplete in range");

    // All waves proven
    const allProven = proveAllWaves(r.mission);
    const doneProgress = getMissionProgress(allProven, null);
    assert(doneProgress.percentComplete === 100, "all proven: 100% complete");

    // formatUserFacingStatus returns a non-empty string
    const status = formatUserFacingStatus(compiled);
    assert(typeof status === "string" && status.length > 10, "formatUserFacingStatus returns non-empty string");
  }

  // ── [E2E-11] detectWaveType handles all catalog wave IDs ─────────────────
  console.log("\n[E2E-11] detectWaveType identifies all catalog wave types correctly");
  {
    const waveIds = [
      "repo_layout", "api_schema", "spec_compiler", "execution_runtime",
      "builder_factory", "repair_replay", "truth_memory", "intelligence_shell",
      "governance_security", "deployment_rollback", "validation_proof", "fresh_clone_proof",
    ];
    for (const id of waveIds) {
      const wt = detectWaveType(id);
      assert(wt !== null, `detectWaveType("${id}") returns non-null`);
      const rules = getProofRules(wt!);
      assert(rules.length > 0, `proofRules for "${id}" non-empty`);
    }
  }

  // ── [E2E-12] Cross-fixture: each fixture reaches distinct claim levels ────
  console.log("\n[E2E-12] Cross-fixture: full simulation reaches SYSTEM_LAUNCH_READY for all fixtures");
  {
    const fixtures = [
      { spec: ENTERPRISE_SAAS_SPEC, id: ENTERPRISE_SAAS_PROJECT_ID, name: "enterprise-saas" },
      { spec: MARKETPLACE_SPEC, id: MARKETPLACE_PROJECT_ID, name: "marketplace" },
      { spec: NEXUS_BENCHMARK_SPEC, id: NEXUS_BENCHMARK_PROJECT_ID, name: "nexus-benchmark" },
    ];
    for (const f of fixtures) {
      const r = compileSpecToMission({ specText: f.spec, sourceFile: `${f.name}.md`, projectId: f.id });
      const allProven = proveAllWaves(r.mission);
      const level = evaluateMissionClaim(allProven);
      assert(level === "SYSTEM_LAUNCH_READY", `${f.name}: reaches SYSTEM_LAUNCH_READY when all proven`);

      // Claim boundary report must be non-empty and structured
      const report = formatClaimBoundaryReport(allProven);
      assert(report.includes("✅ SYSTEM_LAUNCH_READY"), `${f.name}: report shows SYSTEM_LAUNCH_READY allowed`);
      assert(!report.includes("🔒 SYSTEM_LAUNCH_READY"), `${f.name}: report does not show SYSTEM_LAUNCH_READY blocked`);
    }
  }

  // ── [E2E-13] canWaveRun respects dependency ordering ─────────────────────
  console.log("\n[E2E-13] canWaveRun correctly enforces dependency ordering");
  {
    const r = compileSpecToMission({ specText: ENTERPRISE_SAAS_SPEC, sourceFile: "ent.md", projectId: "e2e_deps" });
    const withDeps = r.mission.waves.filter((w) => w.dependsOn.length > 0);

    if (withDeps.length > 0) {
      const depWave = withDeps[0];
      // Before deps proven: cannot run
      assert(!canWaveRun(r.mission, depWave.waveId), `wave with deps cannot run before deps proven`);

      // After deps proven: can run
      const withProvenDeps = proveWaves(r.mission, depWave.dependsOn);
      assert(canWaveRun(withProvenDeps, depWave.waveId), `wave with deps can run after deps proven`);
    }
  }

  // ── [E2E-14] Architecture detection correctness ───────────────────────────
  console.log("\n[E2E-14] Architecture and product detection correctness");
  {
    const cases = [
      { spec: ENTERPRISE_SAAS_SPEC, expectedProduct: "saas_platform", nameHint: "enterprise-saas" },
      { spec: MARKETPLACE_SPEC, expectedProduct: "marketplace", nameHint: "marketplace" },
    ];
    for (const c of cases) {
      const product = detectProductType(c.spec);
      const arch = detectTargetArchitecture(c.spec);
      assert(product === c.expectedProduct, `${c.nameHint}: product type "${product}" (expected "${c.expectedProduct}")`);
      assert(typeof arch === "string" && arch.length > 0, `${c.nameHint}: architecture detected: "${arch}"`);
    }
  }

  // ── [E2E-15] Proof rules coverage — all wave types have rules ────────────
  console.log("\n[E2E-15] All waves in any compiled mission have proof rules");
  {
    const r = compileSpecToMission({ specText: ENTERPRISE_SAAS_SPEC, sourceFile: "ent.md", projectId: "e2e_rules" });
    for (const w of r.mission.waves) {
      const wt = detectWaveType(w.waveId);
      if (wt) {
        const rules = getProofRules(wt);
        assert(rules.length > 0, `wave "${w.waveId}": proof rules exist`);
      } else {
        // Unknown wave type — should still have acceptance criteria
        assert(w.acceptanceCriteria.length > 0, `wave "${w.waveId}": has acceptance criteria`);
      }
    }
  }

  // ── Summary ──────────────────────────────────────────────────────────────
  console.log("\n──────────────────────────────────────────────────");
  console.log(`Mission E2E Tests: ${passed} passed, ${failed} failed`);
  if (failed > 0) {
    console.error("❌ Some E2E tests failed");
    process.exit(1);
  } else {
    console.log("✅ All mission E2E tests passed");
  }
}

runTests().catch((err) => {
  console.error("E2E test runner error:", err);
  process.exit(1);
});
