import assert from "assert";
import fs from "fs";
import os from "os";
import path from "path";
import { validateClaim99EntitlementReadiness } from "../repoValidators/claim99EntitlementReadiness";

function writeFile(root: string, rel: string, content: string) {
  const full = path.join(root, rel);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content, "utf8");
}

function buildFixtureRoot(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "claim99-entitlement-readiness-"));
}

function writeRequiredPolicyDocs(root: string) {
  writeFile(root, "MASTER_TRUTH_SPEC.md", "# master truth\n\n99% is north-star until independently proven.");
  writeFile(root, "LEGAL_CLAIM_BOUNDARIES.md", "# legal\n\nRepresentative proof caveat. Deployment readiness caveat.");
  writeFile(root, "EVIDENCE_BOUNDARY_POLICY.md", "# policy\n\nIncludes live-deployment-proven and exhaustive-domain-proven.");
  writeFile(root, "MARKETING_CLAIMS_ALLOWED.md", "# marketing\n\n## Prohibited current claims\n- \"Builds 99% of all software\"\n");
  writeFile(root, "release-evidence/runtime/live_deployment_provider_execution_proof.json", JSON.stringify({ status: "blocked" }, null, 2));
  writeFile(root, "release-evidence/runtime/autobuild_99_statistical_proof.json", JSON.stringify({ status: "blocked" }, null, 2));
  writeFile(root, "release-evidence/runtime/claim_99_independent_audit.json", JSON.stringify({ status: "pending" }, null, 2));
}

function writeBlockedProof(root: string) {
  writeFile(
    root,
    "release-evidence/runtime/claim_99_entitlement_proof.json",
    JSON.stringify(
      {
        status: "blocked",
        claimId: "fully_built_live_and_autobuild_99_percent_of_supported_scope",
        entitled: false,
        requirements: [
          { id: "exhaustive_domain_proof", satisfied: true },
          { id: "live_deployment_proven_all_declared_providers", satisfied: false },
          { id: "autobuild_99_statistical_threshold", satisfied: false },
          { id: "independent_verification_audit", satisfied: false },
        ],
        unmetRequirements: [
          "live_deployment_proven_all_declared_providers",
          "autobuild_99_statistical_threshold",
          "independent_verification_audit",
        ],
      },
      null,
      2
    )
  );
}

function testBlockedStatePassesAsFailClosed() {
  const root = buildFixtureRoot();
  writeRequiredPolicyDocs(root);
  writeBlockedProof(root);

  const result = validateClaim99EntitlementReadiness(root);
  assert.strictEqual(result.status, "passed");
}

function testBlockedStateRequiresUnmetRequirements() {
  const root = buildFixtureRoot();
  writeRequiredPolicyDocs(root);
  writeFile(
    root,
    "release-evidence/runtime/claim_99_entitlement_proof.json",
    JSON.stringify(
      {
        status: "blocked",
        claimId: "fully_built_live_and_autobuild_99_percent_of_supported_scope",
        entitled: false,
        requirements: [
          { id: "exhaustive_domain_proof", satisfied: true },
          { id: "live_deployment_proven_all_declared_providers", satisfied: false },
          { id: "autobuild_99_statistical_threshold", satisfied: false },
          { id: "independent_verification_audit", satisfied: false },
        ],
        unmetRequirements: [],
      },
      null,
      2
    )
  );

  const result = validateClaim99EntitlementReadiness(root);
  assert.strictEqual(result.status, "failed");
  assert(result.summary.includes("must list unmet requirements"));
}

function testEligibleStateFailsWithoutPolicyUpgrade() {
  const root = buildFixtureRoot();
  writeRequiredPolicyDocs(root);
  writeFile(
    root,
    "release-evidence/runtime/claim_99_entitlement_proof.json",
    JSON.stringify(
      {
        status: "eligible",
        claimId: "fully_built_live_and_autobuild_99_percent_of_supported_scope",
        entitled: true,
        requirements: [
          { id: "exhaustive_domain_proof", satisfied: true },
          { id: "live_deployment_proven_all_declared_providers", satisfied: true },
          { id: "autobuild_99_statistical_threshold", satisfied: true },
          { id: "independent_verification_audit", satisfied: true },
        ],
        unmetRequirements: [],
      },
      null,
      2
    )
  );

  const result = validateClaim99EntitlementReadiness(root);
  assert.strictEqual(result.status, "failed");
  assert(result.summary.includes("marketing policy updates"));
}

function run() {
  testBlockedStatePassesAsFailClosed();
  testBlockedStateRequiresUnmetRequirements();
  testEligibleStateFailsWithoutPolicyUpgrade();
  console.log("claim99EntitlementReadiness.test.ts passed");
}

run();
