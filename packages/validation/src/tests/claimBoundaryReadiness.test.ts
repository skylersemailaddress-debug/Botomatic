import assert from "assert";
import fs from "fs";
import os from "os";
import path from "path";
import { validateClaimBoundaryReadiness } from "../repoValidators/claimBoundaryReadiness";

function writeFile(root: string, rel: string, content: string) {
  const full = path.join(root, rel);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content, "utf8");
}

function buildFixtureRoot(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "claim-boundary-readiness-"));
}

function writeRequiredDocs(root: string) {
  writeFile(root, "README.md", `# Botomatic\n\n## Claim boundaries\n- LEGAL_CLAIM_BOUNDARIES.md\n- EVIDENCE_BOUNDARY_POLICY.md\n- MARKETING_CLAIMS_ALLOWED.md\n`);
  writeFile(root, "LEGAL_CLAIM_BOUNDARIES.md", `# LEGAL\n\n## Required caveats\n- Representative proof is not exhaustive proof.\n- Live deployment requires explicit approval.\n- Real credentials are required for live deployment.\n\n## Prohibited language\n- \"Builds 99% of all software\"\n- \"Fully replaces developers\"\n`);
  writeFile(root, "EVIDENCE_BOUNDARY_POLICY.md", `# EVIDENCE\n\n- Failed critical validators block launch-ready claims.\n- Current code and validator output beat old docs.\n- No placeholder/fake integration path may support a commercial claim.\n`);
  writeFile(root, "MARKETING_CLAIMS_ALLOWED.md", `# MARKETING\n\n## Prohibited current claims\n- \"Builds 99% of all software\"\n- \"Guaranteed launch-ready\"\n`);
  writeFile(root, "docs/readiness/CLAIM_READINESS.md", "Representative readiness notes only.");
}

function testGoodFixturePasses() {
  const root = buildFixtureRoot();
  writeRequiredDocs(root);

  const result = validateClaimBoundaryReadiness(root);
  assert.strictEqual(result.status, "passed");
}

function testProhibitedClaimOutsideSectionFails() {
  const root = buildFixtureRoot();
  writeRequiredDocs(root);
  writeFile(root, "docs/marketing/LAUNCH.md", "This product is guaranteed launch-ready.");

  const result = validateClaimBoundaryReadiness(root);
  assert.strictEqual(result.status, "failed");
  assert(result.summary.includes("Unsupported public claim language detected"));
}

function testProhibitedExamplesSectionAllowed() {
  const root = buildFixtureRoot();
  writeRequiredDocs(root);
  writeFile(root, "MARKETING_CLAIMS_ALLOWED.md", `# MARKETING\n\n## Prohibited examples\n- \"Live deployment proven across all providers\"\n`);

  const result = validateClaimBoundaryReadiness(root);
  assert.strictEqual(result.status, "passed");
  assert(!result.summary.includes("Unsupported public claim language detected"));
}

function testCrlfProhibitedClaimOutsideSectionFails() {
  const root = buildFixtureRoot();
  writeRequiredDocs(root);
  writeFile(
    root,
    "MARKETING_CLAIMS_ALLOWED.md",
    "# MARKETING\r\n\r\n## Prohibited current claims\r\n- \"Builds 99% of all software\"\r\n\r\n## Allowed current claims\r\nThis is guaranteed launch-ready.\r\n"
  );

  const result = validateClaimBoundaryReadiness(root);
  assert.strictEqual(result.status, "failed");
  assert(result.summary.includes("Unsupported public claim language detected"));
  assert(result.summary.includes("MARKETING_CLAIMS_ALLOWED.md:"));
}

function run() {
  testGoodFixturePasses();
  testProhibitedClaimOutsideSectionFails();
  testProhibitedExamplesSectionAllowed();
  testCrlfProhibitedClaimOutsideSectionFails();
  console.log("claimBoundaryReadiness.test.ts passed");
}

run();
