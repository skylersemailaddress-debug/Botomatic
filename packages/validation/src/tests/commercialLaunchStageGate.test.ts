import assert from "node:assert";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { validateCommercialLaunchStageGate } from "../repoValidators/commercialLaunchStageGate";

function writeFile(root: string, rel: string, content: string) {
  const full = path.join(root, rel);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content, "utf8");
}

function buildFixtureRoot(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "commercial-launch-stage-gate-"));
}

function writePolicyDocs(root: string, claimStage = "enterprise_pilot", blocked = ["public_launch"]) {
  const blockedText = blocked.map((stage) => `\`${stage}\``).join(", ") || "none";
  writeFile(root, "README.md", "# Botomatic\n\nSee docs/beta/COMMERCIAL_LAUNCH_STAGE_GATE.md\n");
  writeFile(
    root,
    "docs/beta/COMMERCIAL_LAUNCH_STAGE_GATE.md",
    `# Gate\n\nCurrent commercial launch claim stage: \`${claimStage}\`\nNot currently claimable stages: ${blockedText}\n`
  );
  writeFile(
    root,
    "MARKETING_CLAIMS_ALLOWED.md",
    `# Marketing\n\nCurrent commercial launch claim stage: \`${claimStage}\`\nNot currently claimable stages: ${blockedText}\n`
  );
  writeFile(root, "package.json", "{\"scripts\":{\"validate:commercial-launch\":\"tsx scripts/validateCommercialLaunchStageGate.ts\"}}\n");
}

function writeMatrix(root: string, claimStage = "enterprise_pilot", blocked = ["public_launch"]) {
  writeFile(
    root,
    "release-evidence/commercial_launch_stage_matrix.json",
    JSON.stringify(
      {
        currentClaimStage: claimStage,
        notClaimableStages: blocked,
        stages: [
          stage("local_dev", ["a"]),
          stage("friends_family_beta", ["a", "b"]),
          stage("paid_beta", ["a", "b", "c"]),
          stage("enterprise_pilot", ["a", "b", "c", "d"]),
          stage("public_launch", ["a", "b", "c", "d", "public-launch-billing-proof-not-yet-created"]),
        ],
      },
      null,
      2
    )
  );
}

function stage(id: string, proofs: string[]) {
  const mk = (p: string[]) => ({ applicable: true, proofs: p });
  return {
    id,
    requiredProofs: {
      security: mk(proofs.slice(0, 1)),
      durable_e2e: mk(proofs.slice(0, 1)),
      tenant_isolation: mk(proofs.slice(0, 1)),
      deployment: mk(proofs.slice(0, 1)),
      generated_app_quality: mk(proofs.slice(0, 1)),
      observability: mk(proofs.slice(0, 1)),
      support_runbooks: mk(proofs.slice(0, 1)),
      legal_compliance: mk(proofs.slice(0, 1)),
      billing: id === "public_launch" ? mk(["public-launch-billing-proof-not-yet-created"]) : { applicable: false, proofs: [] },
    },
  };
}

function writeProofFiles(root: string) {
  for (const rel of ["a", "b", "c", "d"]) {
    writeFile(root, rel, "{}\n");
  }
}

function testPassesWhenClaimedStageIsProvenAndBlockedStageIsDeclared() {
  const root = buildFixtureRoot();
  writePolicyDocs(root);
  writeMatrix(root);
  writeProofFiles(root);

  const result = validateCommercialLaunchStageGate(root);
  assert.strictEqual(result.status, "passed");
}

function testFailsWhenClaimedStageIsNotProven() {
  const root = buildFixtureRoot();
  writePolicyDocs(root, "public_launch");
  writeMatrix(root, "public_launch");
  writeProofFiles(root);

  const result = validateCommercialLaunchStageGate(root);
  assert.strictEqual(result.status, "failed");
  assert(result.summary.includes("not proven"));
}

function testFailsWhenDocsDriftFromMatrixClaimStage() {
  const root = buildFixtureRoot();
  writePolicyDocs(root, "paid_beta");
  writeMatrix(root, "enterprise_pilot");
  writeProofFiles(root);

  const result = validateCommercialLaunchStageGate(root);
  assert.strictEqual(result.status, "failed");
  assert(result.summary.includes("must include"));
}

function run() {
  testPassesWhenClaimedStageIsProvenAndBlockedStageIsDeclared();
  testFailsWhenClaimedStageIsNotProven();
  testFailsWhenDocsDriftFromMatrixClaimStage();
  console.log("commercialLaunchStageGate.test.ts passed");
}

run();
