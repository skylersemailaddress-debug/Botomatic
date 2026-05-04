import { compileSpecToMission } from "../specToMissionCompiler.js";
import { validateWaveDependencies, planWaves, canWaveRun } from "../wavePlanner.js";
import { evaluateMissionClaim, checkClaimBoundary, formatClaimBoundaryReport } from "../missionClaimBoundary.js";
import { saveCheckpoint, loadCheckpoint } from "../missionRunner.js";
import type { Mission } from "../missionModel.js";
import fs from "fs";
import os from "os";
import path from "path";

const NEXUS_SPEC_SUMMARY = [
  "NEXUS CANONICAL MASTER BUILD SPEC",
  "Nexus is a unified synthetic-intelligence operating system and autonomous software factory.",
  "repo layout, monorepo, API contracts, data schema, database migrations, deterministic spec compiler,",
  "DAS, IBC, build contract, execution runtime, job queue, worker, builder engine, factory,",
  "blueprint registry, code generation, workspace materializer, repair engine, dirty repo completion,",
  "rollback, replay, truth engine, memory engine, 9 memory classes, intelligence shell, command spine,",
  "operational focus pane, prediction surface, scenario lab, interventions, governance, RBAC,",
  "tenant isolation, secrets management, approval tiers, autonomy policy, deployment, rollback, export,",
  "Vercel adapter, dry-run, live deploy, validation system, proof ladder, claim boundary, evidence,",
  "fresh clone proof, end-to-end system launch ready.",
].join("\n");

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

async function runTests(): Promise<void> {
  // ── Test 1: Same spec → same mission hash ──────────────────────────────────
  console.log("\n[1] Determinism: same spec → same mission hash");
  {
    const r1 = compileSpecToMission({ specText: NEXUS_SPEC_SUMMARY, sourceFile: "nexus.md", projectId: "proj_test" });
    const r2 = compileSpecToMission({ specText: NEXUS_SPEC_SUMMARY, sourceFile: "nexus.md", projectId: "proj_test" });
    assert(r1.specHash === r2.specHash, "specHash identical across two compilations of same input");
    assert(r1.sourceHash === r2.sourceHash, "sourceHash identical across two compilations of same input");
    assert(r1.waveCount === r2.waveCount, "waveCount identical across two compilations");
    assert(r1.mission.missionId === r2.mission.missionId, "missionId identical across two compilations");
  }

  // ── Test 2: Different spec → different hash ────────────────────────────────
  console.log("\n[2] Determinism: different spec → different hash");
  {
    const r1 = compileSpecToMission({ specText: NEXUS_SPEC_SUMMARY, sourceFile: "nexus.md", projectId: "proj_test" });
    const r2 = compileSpecToMission({ specText: "A simple todo app.", sourceFile: "todo.md", projectId: "proj_test" });
    assert(r1.specHash !== r2.specHash, "Different specs produce different specHash");
    assert(r1.sourceHash !== r2.sourceHash, "Different specs produce different sourceHash");
  }

  // ── Test 3: Nexus spec produces required waves ─────────────────────────────
  console.log("\n[3] Nexus spec produces all required waves");
  {
    const result = compileSpecToMission({ specText: NEXUS_SPEC_SUMMARY, sourceFile: "nexus.md", projectId: "proj_nexus" });
    const waveIds = new Set(result.mission.waves.map((w) => w.waveId));
    const required = [
      "repo_layout", "api_schema", "spec_compiler", "execution_runtime",
      "builder_factory", "repair_replay", "truth_memory", "intelligence_shell",
      "governance_security", "deployment_rollback", "validation_proof", "fresh_clone_proof",
    ];
    for (const id of required) {
      assert(waveIds.has(id), `Wave "${id}" present in compiled mission`);
    }
    assert(result.waveCount >= 12, `At least 12 waves compiled (got ${result.waveCount})`);
  }

  // ── Test 4: Wave dependencies are valid ────────────────────────────────────
  console.log("\n[4] Wave dependency validation");
  {
    const result = compileSpecToMission({ specText: NEXUS_SPEC_SUMMARY, sourceFile: "nexus.md", projectId: "proj_nexus" });
    const validation = validateWaveDependencies(result.mission.waves);
    assert(validation.valid, `Wave dependencies valid (errors: ${validation.errors.join(", ")})`);
    assert(validation.circularPaths.length === 0, "No circular dependencies detected");
    assert(validation.errors.length === 0, "No unknown dependency references");
  }

  // ── Test 5: No wave runs before dependencies proven ────────────────────────
  console.log("\n[5] Wave planner: topological order respects dependencies");
  {
    const result = compileSpecToMission({ specText: NEXUS_SPEC_SUMMARY, sourceFile: "nexus.md", projectId: "proj_nexus" });
    const { orderedWaves } = planWaves(result.mission);
    const provenSoFar = new Set<string>();
    let orderViolation = false;
    for (const wave of orderedWaves) {
      for (const dep of wave.dependsOn) {
        if (!provenSoFar.has(dep)) {
          orderViolation = true;
          console.error(`    Order violation: "${wave.waveId}" before dep "${dep}"`);
        }
      }
      provenSoFar.add(wave.waveId);
    }
    assert(!orderViolation, "Topological ordering respects all dependencies");
    const firstWave = orderedWaves[0];
    assert(firstWave?.waveId === "repo_layout", `repo_layout is first wave (got: ${firstWave?.waveId})`);
    const lastWave = orderedWaves[orderedWaves.length - 1];
    assert(lastWave?.waveId === "fresh_clone_proof", `fresh_clone_proof is last wave (got: ${lastWave?.waveId})`);
  }

  // ── Test 6: canWaveRun blocked by unproven deps ────────────────────────────
  console.log("\n[6] canWaveRun blocks waves with unproven dependencies");
  {
    const result = compileSpecToMission({ specText: NEXUS_SPEC_SUMMARY, sourceFile: "nexus.md", projectId: "proj_nexus" });
    assert(!canWaveRun(result.mission, "fresh_clone_proof"), "fresh_clone_proof blocked on fresh mission");
    assert(!canWaveRun(result.mission, "builder_factory"), "builder_factory blocked before deps proven");
    assert(canWaveRun(result.mission, "repo_layout"), "repo_layout runnable on fresh mission (no deps)");
  }

  // ── Test 7: Checkpoint save and resume ────────────────────────────────────
  console.log("\n[7] Checkpoint save and resume");
  {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "mission-test-"));
    try {
      const result = compileSpecToMission({ specText: NEXUS_SPEC_SUMMARY, sourceFile: "nexus.md", projectId: "proj_resume" });
      const missionWithProgress: Mission = {
        ...result.mission,
        waves: result.mission.waves.map((w) =>
          w.waveId === "repo_layout" ? { ...w, status: "proven", provenAt: new Date().toISOString() } : w
        ),
        provenWaves: 1,
      };
      await saveCheckpoint(missionWithProgress, { checkpointDir: tmpDir, apiBaseUrl: "", apiToken: "", dryRun: true });
      const loaded = await loadCheckpoint(tmpDir);
      assert(loaded !== null, "Checkpoint loads successfully after save");
      assert(loaded!.missionId === missionWithProgress.missionId, "Resumed mission has correct missionId");
      assert(loaded!.provenWaves === 1, "Resumed mission preserves provenWaves count");
      const repoWave = loaded!.waves.find((w) => w.waveId === "repo_layout");
      assert(repoWave?.status === "proven", "Resumed mission preserves proven wave status");
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  }

  // ── Test 8: Claim boundary blocks overclaim ───────────────────────────────
  console.log("\n[8] Claim boundary: no claim above evidence");
  {
    const result = compileSpecToMission({ specText: NEXUS_SPEC_SUMMARY, sourceFile: "nexus.md", projectId: "proj_claim" });
    assert(evaluateMissionClaim(result.mission) === "MISSION_COMPILED", "Fresh mission = MISSION_COMPILED");
    assert(!checkClaimBoundary(result.mission, "SYSTEM_BUILDABLE").allowed, "SYSTEM_BUILDABLE blocked on fresh mission");
    assert(!checkClaimBoundary(result.mission, "SYSTEM_LAUNCH_READY").allowed, "SYSTEM_LAUNCH_READY blocked on fresh mission");
    assert(checkClaimBoundary(result.mission, "MISSION_COMPILED").allowed, "MISSION_COMPILED allowed on fresh mission");

    const partialMission: Mission = {
      ...result.mission,
      waves: result.mission.waves.map((w) =>
        w.waveId === "repo_layout" ? { ...w, status: "proven" } : w
      ),
      provenWaves: 1,
    };
    const partialClaim = evaluateMissionClaim(partialMission);
    assert(partialClaim === "SYSTEM_PARTIAL", `SYSTEM_PARTIAL after repo_layout proven (got: ${partialClaim})`);
    assert(!checkClaimBoundary(partialMission, "SYSTEM_BUILDABLE").allowed, "SYSTEM_BUILDABLE blocked on partial");

    const buildableWaves = ["repo_layout", "api_schema", "spec_compiler", "execution_runtime", "builder_factory"];
    const buildableMission: Mission = {
      ...result.mission,
      waves: result.mission.waves.map((w) =>
        buildableWaves.includes(w.waveId) ? { ...w, status: "proven" } : w
      ),
      provenWaves: buildableWaves.length,
    };
    const buildableClaim = evaluateMissionClaim(buildableMission);
    assert(buildableClaim === "SYSTEM_BUILDABLE", `SYSTEM_BUILDABLE after core waves proven (got: ${buildableClaim})`);
    assert(!checkClaimBoundary(buildableMission, "SYSTEM_LAUNCH_READY").allowed, "SYSTEM_LAUNCH_READY blocked on partial");
  }

  // ── Test 9: Mission report lists unproven waves ───────────────────────────
  console.log("\n[9] Mission report includes all claim levels and unproven waves");
  {
    const result = compileSpecToMission({ specText: NEXUS_SPEC_SUMMARY, sourceFile: "nexus.md", projectId: "proj_report" });
    const report = formatClaimBoundaryReport(result.mission);
    assert(typeof report === "string" && report.length > 0, "formatClaimBoundaryReport returns non-empty string");
    assert(report.includes("MISSION_COMPILED"), "Report includes MISSION_COMPILED");
    assert(report.includes("SYSTEM_LAUNCH_READY"), "Report includes SYSTEM_LAUNCH_READY");
    assert(report.includes("🔒"), "Report shows blocked claim levels");
    assert(report.includes("✅"), "Report shows allowed claim levels");
    const unproven = result.mission.waves.filter((w) => w.status !== "proven");
    assert(unproven.length === result.mission.totalWaves, `All ${result.mission.totalWaves} waves unproven on fresh mission`);
  }

  // ── Test 10: Packets are well-formed ─────────────────────────────────────
  console.log("\n[10] Packets are well-formed");
  {
    const result = compileSpecToMission({ specText: NEXUS_SPEC_SUMMARY, sourceFile: "nexus.md", projectId: "proj_packets" });
    for (const wave of result.mission.waves) {
      assert(wave.packets.length > 0, `Wave "${wave.waveId}" has ≥1 packet`);
      for (const packet of wave.packets) {
        assert(packet.goal.length > 5, `Packet ${packet.packetId} has meaningful goal`);
        assert(packet.acceptanceCriteria.length > 0, `Packet ${packet.packetId} has acceptance criteria`);
      }
    }
  }
}

runTests().then(() => {
  console.log(`\n${"─".repeat(50)}`);
  console.log(`Mission Orchestrator Tests: ${passed} passed, ${failed} failed`);
  if (failed > 0) {
    console.error(`❌ ${failed} test(s) failed`);
    process.exit(1);
  } else {
    console.log(`✅ All mission orchestrator tests passed`);
  }
}).catch((err) => {
  console.error("Test runner error:", err);
  process.exit(1);
});
