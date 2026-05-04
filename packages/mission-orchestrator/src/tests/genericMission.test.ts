import { compileSpecToMission } from "../specToMissionCompiler.js";
import { canWaveRun } from "../wavePlanner.js";
import { evaluateMissionClaim, checkClaimBoundary } from "../missionClaimBoundary.js";
import { saveCheckpoint, loadCheckpoint } from "../missionRunner.js";
import {
  buildContractFromSpec,
  canExecuteMission,
  lockContract,
  isHighRiskField,
} from "../missionContract.js";
import { detectTargetArchitecture, detectProductType } from "../missionTargets.js";
import { getMissionProgress, formatUserFacingStatus } from "../missionStages.js";
import { NEXUS_BENCHMARK_SPEC, NEXUS_BENCHMARK_PROJECT_ID } from "../fixtures/nexus.js";
import { ENTERPRISE_SAAS_SPEC, ENTERPRISE_SAAS_PROJECT_ID } from "../fixtures/enterprise-saas.js";
import { MARKETPLACE_SPEC, MARKETPLACE_PROJECT_ID } from "../fixtures/marketplace.js";
import type { Mission } from "../missionModel.js";
import type { MissionContract } from "../missionContract.js";
import fs from "fs";
import os from "os";
import path from "path";

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

  // ── Test 1: Generic large spec compiles to mission ─────────────────────────
  console.log("\n[1] Generic large spec compiles to mission contract");
  {
    const r = compileSpecToMission({ specText: ENTERPRISE_SAAS_SPEC, sourceFile: "enterprise-saas.md", projectId: "proj_saas_test" });
    assert(r.mission.missionId.startsWith("mission_"), "missionId has correct prefix");
    assert(r.waveCount >= 5, `waveCount >= 5 (got ${r.waveCount})`);
    assert(r.mission.waves.length === r.waveCount, "waves array length matches waveCount");
    assert(r.mission.status === "compiled", "initial status is compiled");
    assert(r.mission.claimLevel === "MISSION_COMPILED", "initial claim level is MISSION_COMPILED");
    assert(r.productType.length > 0, `productType is detected: ${r.productType}`);
    assert(r.targetArchitecture.length > 0, `targetArchitecture is detected: ${r.targetArchitecture}`);
    assert(!!r.sourceHash, "sourceHash is populated");
    assert(!!r.specHash, "specHash is populated");
  }

  // ── Test 2: High-risk unresolved questions block execution ─────────────────
  console.log("\n[2] High-risk unresolved questions block mission execution");
  {
    const r = compileSpecToMission({ specText: ENTERPRISE_SAAS_SPEC, sourceFile: "enterprise-saas.md", projectId: "proj_saas_block" });
    const contract = buildContractFromSpec({
      missionId: r.mission.missionId,
      projectId: "proj_saas_block",
      sourceSpecHash: r.sourceHash,
      sourceType: "text",
      productType: r.productType,
      targetArchitecture: r.targetArchitecture,
      detectedCapabilities: ["auth", "payments", "database"],
      requiredWaves: r.mission.waves.map((w) => w.waveId),
      unresolvedQuestions: [
        { id: "q_auth", field: "auth", question: "Which auth provider is required?", risk: "high", blocking: true },
        { id: "q_payment", field: "payments", question: "Which payment processor?", risk: "high", blocking: true },
      ],
      assumptions: [],
      excludedScope: [],
      acceptanceCriteria: ["all tests pass"],
    });
    const { allowed, reason } = canExecuteMission(contract);
    assert(!allowed, "execution blocked when high-risk questions unresolved");
    assert(reason.includes("high-risk"), `reason mentions high-risk: "${reason}"`);
    assert(contract.blockers.length > 0, "contract.blockers populated for blocking questions");
  }

  // ── Test 3: Low-risk assumptions are recorded (not blocking) ───────────────
  console.log("\n[3] Low-risk assumptions recorded without blocking");
  {
    const r = compileSpecToMission({ specText: MARKETPLACE_SPEC, sourceFile: "marketplace.md", projectId: "proj_mkt_test" });
    const contract = buildContractFromSpec({
      missionId: r.mission.missionId,
      projectId: "proj_mkt_test",
      sourceSpecHash: r.sourceHash,
      sourceType: "text",
      productType: r.productType,
      targetArchitecture: r.targetArchitecture,
      detectedCapabilities: ["api", "frontend"],
      requiredWaves: r.mission.waves.map((w) => w.waveId),
      unresolvedQuestions: [],
      assumptions: [
        { id: "a_email", field: "email_provider", decision: "Use Resend for transactional email", reason: "Low-risk default", risk: "low", autoDecided: true },
        { id: "a_cdn", field: "cdn", decision: "Use Vercel CDN by default", reason: "Co-located with deployment", risk: "low", autoDecided: true },
      ],
      excludedScope: [],
      acceptanceCriteria: ["all tests pass"],
    });
    assert(contract.assumptions.length === 2, "two assumptions recorded");
    assert(contract.blockers.length === 0, "no blockers from low-risk assumptions");
    assert(contract.assumptions.every((a) => a.risk === "low"), "assumptions are all low-risk");
    const { allowed } = canExecuteMission(contract);
    assert(!allowed, "execution blocked because contract not approved (needs approval even with no blocking questions)");
  }

  // ── Test 4: Locked contract required before wave execution ─────────────────
  console.log("\n[4] Locked contract required before wave execution");
  {
    const r = compileSpecToMission({ specText: ENTERPRISE_SAAS_SPEC, sourceFile: "enterprise-saas.md", projectId: "proj_lock_test" });
    const contract = buildContractFromSpec({
      missionId: r.mission.missionId,
      projectId: "proj_lock_test",
      sourceSpecHash: r.sourceHash,
      sourceType: "text",
      productType: r.productType,
      targetArchitecture: r.targetArchitecture,
      detectedCapabilities: [],
      requiredWaves: r.mission.waves.map((w) => w.waveId),
      unresolvedQuestions: [],
      assumptions: [],
      excludedScope: [],
      acceptanceCriteria: ["all tests pass"],
    });
    assert(!contract.userApproved, "contract starts unapproved");
    assert(contract.lockedAt === undefined, "contract starts unlocked");
    const locked = lockContract(contract, "test_user");
    assert(locked.userApproved, "contract is approved after locking");
    assert(!!locked.lockedAt, "lockedAt is set after locking");
    assert(!!locked.lockedSpecVersion, "lockedSpecVersion is set");
    const { allowed } = canExecuteMission(locked);
    assert(allowed, "execution allowed after locking with no blockers");
  }

  // ── Test 5: Cannot lock contract with blocking questions ───────────────────
  console.log("\n[5] Cannot lock contract with blocking high-risk questions");
  {
    const r = compileSpecToMission({ specText: MARKETPLACE_SPEC, sourceFile: "marketplace.md", projectId: "proj_nolock" });
    const contract = buildContractFromSpec({
      missionId: r.mission.missionId,
      projectId: "proj_nolock",
      sourceSpecHash: r.sourceHash,
      sourceType: "text",
      productType: r.productType,
      targetArchitecture: r.targetArchitecture,
      detectedCapabilities: [],
      requiredWaves: [],
      unresolvedQuestions: [
        { id: "q_db", field: "database", question: "Which database to use?", risk: "high", blocking: true },
      ],
      assumptions: [],
      excludedScope: [],
      acceptanceCriteria: [],
    });
    let threw = false;
    try { lockContract(contract, "test"); } catch { threw = true; }
    assert(threw, "lockContract throws when blocking questions exist");
  }

  // ── Test 6: Generic wave converts to builder-compatible request ────────────
  console.log("\n[6] Generic wave produces builder-compatible request");
  {
    const r = compileSpecToMission({ specText: ENTERPRISE_SAAS_SPEC, sourceFile: "enterprise-saas.md", projectId: "proj_wave_test" });
    const wave = r.mission.waves[0];
    assert(!!wave, "first wave exists");
    assert(wave.packets.length > 0, "wave has packets");
    assert(wave.acceptanceCriteria.length > 0, "wave has acceptance criteria");
    assert(wave.requiredValidators.length > 0, "wave has required validators");
    // Simulate builder request construction (as missionRunner would do)
    const builderRequest = `[MISSION WAVE] ${wave.name}: ${wave.description}. Packets: ${wave.packets.map((p) => p.goal).join("; ")}`;
    assert(builderRequest.includes(wave.name), "builder request includes wave name");
    assert(builderRequest.includes("[MISSION WAVE]"), "builder request has MISSION WAVE marker");
    assert(!builderRequest.includes("undefined"), "builder request has no undefined values");
  }

  // ── Test 7: Wave cannot be proven without proof requirements ──────────────
  console.log("\n[7] Wave cannot be marked proven without evidence");
  {
    const r = compileSpecToMission({ specText: ENTERPRISE_SAAS_SPEC, sourceFile: "enterprise-saas.md", projectId: "proj_proof_test" });
    const wave = r.mission.waves[0];
    // A wave with no evidence and status pending cannot be claimed as proven
    assert(wave.status === "pending", "wave starts pending");
    assert(wave.evidence.length === 0, "wave starts with no evidence");
    assert(wave.provenAt === undefined, "wave has no provenAt timestamp");
    const claimBeforeProof = checkClaimBoundary(r.mission, "WAVE_PROVEN");
    assert(!claimBeforeProof.allowed, "cannot claim WAVE_PROVEN with no proven waves");
  }

  // ── Test 8: Checkpoint resume skips proven waves ───────────────────────────
  console.log("\n[8] Checkpoint resume skips proven waves, reruns failed/pending");
  {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "mission-test-"));
    const config = { checkpointDir: tmpDir, apiBaseUrl: "http://localhost:3001", apiToken: "test" };

    const r = compileSpecToMission({ specText: ENTERPRISE_SAAS_SPEC, sourceFile: "enterprise-saas.md", projectId: "proj_resume_test" });
    const mission: Mission = r.mission;

    // Mark first wave as proven
    const now = new Date().toISOString();
    const missionWithProven: Mission = {
      ...mission,
      provenWaves: 1,
      waves: mission.waves.map((w, i) =>
        i === 0 ? { ...w, status: "proven", provenAt: now } : w
      ),
    };

    await saveCheckpoint(missionWithProven, config);
    const loaded = await loadCheckpoint(tmpDir);

    assert(loaded !== null, "checkpoint loads successfully");
    assert(loaded!.provenWaves === 1, "checkpoint preserves proven wave count");
    assert(loaded!.waves[0].status === "proven", "proven wave status preserved");
    assert(loaded!.waves.slice(1).every((w) => w.status === "pending"), "remaining waves still pending");

    fs.rmSync(tmpDir, { recursive: true, force: true });
  }

  // ── Test 9: Claim boundary prevents overclaiming ───────────────────────────
  console.log("\n[9] Claim boundary blocks overclaiming");
  {
    const r = compileSpecToMission({ specText: ENTERPRISE_SAAS_SPEC, sourceFile: "enterprise-saas.md", projectId: "proj_claim_test" });

    // Fresh mission — no proven waves
    const compiledCheck = checkClaimBoundary(r.mission, "MISSION_COMPILED");
    assert(compiledCheck.allowed, "MISSION_COMPILED claim allowed on fresh mission");

    const waveReadyCheck = checkClaimBoundary(r.mission, "WAVE_READY");
    assert(!waveReadyCheck.allowed, "WAVE_READY cannot be claimed with no ready/proven waves");

    const launchCheck = checkClaimBoundary(r.mission, "SYSTEM_LAUNCH_READY");
    assert(!launchCheck.allowed, "SYSTEM_LAUNCH_READY cannot be claimed on fresh mission");
  }

  // ── Test 10: One-button mission shows user-friendly stages ─────────────────
  console.log("\n[10] getMissionProgress hides wave mechanics from user");
  {
    const r = compileSpecToMission({ specText: MARKETPLACE_SPEC, sourceFile: "marketplace.md", projectId: "proj_stage_test" });

    // Pre-contract: understanding_spec
    const preContract = getMissionProgress(null, null);
    assert(preContract.stage === "understanding_spec", "pre-contract stage is understanding_spec");
    assert(!preContract.needsUserInput, "no user input needed at understanding_spec");

    // Contract unapproved with blocking questions
    const contract: MissionContract = buildContractFromSpec({
      missionId: r.mission.missionId,
      projectId: "proj_stage_test",
      sourceSpecHash: r.sourceHash,
      sourceType: "text",
      productType: r.productType,
      targetArchitecture: r.targetArchitecture,
      detectedCapabilities: [],
      requiredWaves: [],
      unresolvedQuestions: [
        { id: "q_auth", field: "auth", question: "Which auth model?", risk: "high", blocking: true },
      ],
      assumptions: [],
      excludedScope: [],
      acceptanceCriteria: [],
    });
    const blockingStage = getMissionProgress(r.mission, contract);
    assert(blockingStage.stage === "resolving_decisions", "blocking questions → resolving_decisions stage");
    assert(blockingStage.needsUserInput, "user input needed when blocking questions exist");
    assert(blockingStage.blockers.length > 0, "blockers surfaced to user");

    // Approved contract, wave in progress → building stage
    const approvedContract = lockContract({ ...contract, unresolvedQuestions: [] }, "test");
    const now = new Date().toISOString();
    const inProgressMission: Mission = {
      ...r.mission,
      provenWaves: 1,
      waves: r.mission.waves.map((w, i) =>
        i === 0 ? { ...w, status: "proven", provenAt: now } : w
      ),
    };
    const buildingStage = getMissionProgress(inProgressMission, approvedContract);
    assert(!buildingStage.needsUserInput, "no user input needed during building stage");
    assert(buildingStage.percentComplete >= 20, "progress percent >= 20 when building");

    // formatUserFacingStatus is human-readable
    const formatted = formatUserFacingStatus(buildingStage);
    assert(formatted.includes("Stage:"), "formatted status includes Stage label");
    assert(formatted.includes("Progress:"), "formatted status includes Progress");
    assert(!formatted.includes("waveId"), "formatted status does not expose internal waveId");
  }

  // ── Test 11: Nexus compiles as benchmark fixture ───────────────────────────
  console.log("\n[11] Nexus benchmark fixture compiles via generic compiler");
  {
    const r = compileSpecToMission({ specText: NEXUS_BENCHMARK_SPEC, sourceFile: "nexus.md", projectId: NEXUS_BENCHMARK_PROJECT_ID });
    assert(r.waveCount >= 7, `Nexus compiles to >= 7 waves (got ${r.waveCount})`);
    assert(r.targetArchitecture === "enterprise_monorepo", `Nexus detected as enterprise_monorepo (got ${r.targetArchitecture})`);
    // Verify no wave description contains branded "Nexus primary UI"
    const hasNexusBrand = r.mission.waves.some((w) => w.description.includes("Nexus primary UI"));
    assert(!hasNexusBrand, "no wave description contains 'Nexus primary UI'");
    assert(r.mission.missionId.includes(NEXUS_BENCHMARK_PROJECT_ID), "missionId includes projectId");
  }

  // ── Test 12: Non-Nexus fixtures compile and produce waves ──────────────────
  console.log("\n[12] Non-Nexus fixtures compile and produce distinct missions");
  {
    const saas = compileSpecToMission({ specText: ENTERPRISE_SAAS_SPEC, sourceFile: "enterprise-saas.md", projectId: ENTERPRISE_SAAS_PROJECT_ID });
    const mkt = compileSpecToMission({ specText: MARKETPLACE_SPEC, sourceFile: "marketplace.md", projectId: MARKETPLACE_PROJECT_ID });

    assert(saas.waveCount >= 5, `Enterprise SaaS produces >= 5 waves (got ${saas.waveCount})`);
    assert(mkt.waveCount >= 5, `Marketplace produces >= 5 waves (got ${mkt.waveCount})`);
    assert(saas.specHash !== mkt.specHash, "different specs produce different specHashes");
    assert(saas.mission.missionId !== mkt.mission.missionId, "different specs produce different missionIds");
    assert(saas.productType !== mkt.productType || saas.targetArchitecture !== mkt.targetArchitecture,
      "different specs produce different product/architecture classification");
  }

  // ── Test 13: detectTargetArchitecture classifies correctly ────────────────
  console.log("\n[13] detectTargetArchitecture identifies correct target types");
  {
    assert(detectTargetArchitecture("enterprise monorepo platform with apps/ and packages/") === "enterprise_monorepo",
      "enterprise monorepo detected");
    assert(detectTargetArchitecture("multi-service distributed system with microservices") === "multi_service_system",
      "multi-service system detected");
    assert(detectTargetArchitecture("admin panel and back-office control plane") === "admin_console",
      "admin console detected");
    assert(detectTargetArchitecture("REST API microservice with JSON endpoints") === "api_service",
      "API service detected");
    assert(detectTargetArchitecture("marketplace with buyer and seller roles") === "workflow_platform",
      "marketplace detected as workflow_platform");
    assert(detectTargetArchitecture("full-stack SaaS web application with dashboard") === "full_stack_app",
      "full-stack app detected");
  }

  // ── Test 14: detectProductType classifies correctly ───────────────────────
  console.log("\n[14] detectProductType classifies product domains correctly");
  {
    assert(detectProductType("marketplace with vendors and buyers") === "marketplace", "marketplace detected");
    assert(detectProductType("CRM for customer relationship management") === "crm", "crm detected");
    assert(detectProductType("AI assistant with LLM chat interface") === "ai_platform", "ai_platform detected");
    assert(detectProductType("workflow automation and pipeline tool") === "workflow_platform", "workflow_platform detected");
    assert(detectProductType("SaaS subscription service platform") === "saas_platform", "saas_platform detected");
  }

  // ── Test 15: MissionContract blockers from high-risk questions ─────────────
  console.log("\n[15] MissionContract blockers populated from blocking questions");
  {
    const r = compileSpecToMission({ specText: MARKETPLACE_SPEC, sourceFile: "marketplace.md", projectId: "proj_blk_test" });
    const contract = buildContractFromSpec({
      missionId: r.mission.missionId,
      projectId: "proj_blk_test",
      sourceSpecHash: r.sourceHash,
      sourceType: "text",
      productType: r.productType,
      targetArchitecture: r.targetArchitecture,
      detectedCapabilities: [],
      requiredWaves: [],
      unresolvedQuestions: [
        { id: "q1", field: "auth", question: "Auth model?", risk: "high", blocking: true },
        { id: "q2", field: "deployment_target", question: "Deploy where?", risk: "high", blocking: true },
        { id: "q3", field: "notifications", question: "Email provider?", risk: "low", blocking: false },
      ],
      assumptions: [],
      excludedScope: [],
      acceptanceCriteria: [],
    });
    assert(contract.blockers.length === 2, `two blockers for two blocking questions (got ${contract.blockers.length})`);
    assert(contract.unresolvedQuestions.length === 3, "all three questions recorded");
    assert(isHighRiskField("auth"), "auth is a high-risk field");
    assert(isHighRiskField("payments"), "payments is a high-risk field");
    assert(isHighRiskField("deployment_target"), "deployment_target is a high-risk field");
    assert(!isHighRiskField("color_scheme"), "color_scheme is not a high-risk field");
  }

  // ── Test 16: Artifact fields on checkpoints ────────────────────────────────
  console.log("\n[16] MissionCheckpoint supports artifact proof fields");
  {
    const r = compileSpecToMission({ specText: ENTERPRISE_SAAS_SPEC, sourceFile: "enterprise-saas.md", projectId: "proj_art_test" });
    const wave = r.mission.waves[0];
    // Verify MissionWave has optional artifact fields
    assert(wave.waveType === undefined || typeof wave.waveType === "string", "waveType is optional string");
    assert(wave.builderProjectId === undefined, "builderProjectId starts undefined");
    assert(wave.workspacePath === undefined, "workspacePath starts undefined");
    assert(wave.artifactId === undefined, "artifactId starts undefined");
  }

  // ── Final summary ──────────────────────────────────────────────────────────
  console.log(`\n${"─".repeat(50)}`);
  console.log(`Generic Mission Tests: ${passed} passed, ${failed} failed`);
  if (failed > 0) {
    console.error("❌ Some generic mission tests failed");
    process.exit(1);
  }
  console.log("✅ All generic mission tests passed");
}

void runTests().catch((err) => {
  console.error("Fatal error in generic mission tests:", err);
  process.exit(1);
});
