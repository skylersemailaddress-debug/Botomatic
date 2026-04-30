import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (rel: string) => fs.readFileSync(path.join(root, rel), "utf8");
const exists = (rel: string) => fs.existsSync(path.join(root, rel));

assert(exists("release-evidence/rc/WAVE-034_RELEASE_CANDIDATE_ACCEPTANCE_AUDIT.md"), "missing WAVE-034 audit report");
assert(exists("docs/rc/WAVE-035_BACKEND_PROOF_AND_RUNNER_CONTRACTS.md"), "missing WAVE-035 contract doc");

const contract = read("docs/rc/WAVE-035_BACKEND_PROOF_AND_RUNNER_CONTRACTS.md");

for (const section of [
  "Execution runner API contract",
  "Runtime API contract",
  "Launch proof contract",
  "Deploy/rollback contract",
  "Test/build/file-change proof contract",
  "Persistence model",
  "Final route map",
  "Security constraints",
  "Next wave plan"
]) {
  assert(contract.includes(section), `missing section: ${section}`);
}

for (const route of [
  "/api/projects/:projectId/execution",
  "/api/projects/:projectId/jobs",
  "/api/projects/:projectId/runtime/start",
  "/api/projects/:projectId/runtime/stop",
  "/api/projects/:projectId/launch-proof",
  "/api/projects/:projectId/launch/verify",
  "/api/projects/:projectId/deploy",
  "/api/projects/:projectId/rollback"
]) {
  assert(contract.includes(route), `missing route string: ${route}`);
}

for (const statement of [
  "preview alone does not unlock launch",
  "no arbitrary shell from user prompt",
  "allowlisted job types",
  "project-scoped execution only",
  "logs must not leak secrets"
]) {
  assert(contract.includes(statement), `missing statement: ${statement}`);
}

for (const wave of ["025", "026", "027", "028", "029", "030", "031", "032", "033", "034"]) {
  assert(exists(`package.json`), "package.json missing");
  const pkg = read("package.json");
  assert(pkg.includes(`test:wave-${wave}`), `missing prior wave script test:wave-${wave}`);
}

console.log("WAVE-035 backend proof + runner contract checks passed");
