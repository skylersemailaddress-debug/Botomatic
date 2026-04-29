import assert from "assert";
import fs from "fs";
import os from "os";
import path from "path";
import { validateMasterTruthSpecReadiness } from "../repoValidators/masterTruthSpecReadiness";

function write(root: string, rel: string, content: string) {
  const full = path.join(root, rel);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content, "utf8");
}

function mkRoot(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "master-truth-"));
}

const goodSpec = fs.readFileSync(path.join(process.cwd(), "MASTER_TRUTH_SPEC.md"), "utf8");

function setup(root: string, spec: string) {
  write(root, "MASTER_TRUTH_SPEC.md", spec);
  write(root, "README.md", "See MASTER_TRUTH_SPEC.md\n");
  write(root, "docs/final-release-evidence-lock.md", "release-candidate foundation evidence only does not assert max-power completion\n");
  write(root, "ISSUE_STACK.md", "");
}

function run() {
  const repoResult = validateMasterTruthSpecReadiness(process.cwd());
  assert.strictEqual(repoResult.status, "passed", repoResult.summary);

  const missingSpec = mkRoot();
  write(missingSpec, "README.md", "MASTER_TRUTH_SPEC.md");
  write(missingSpec, "docs/final-release-evidence-lock.md", "release-candidate foundation does not assert max-power");
  assert.strictEqual(validateMasterTruthSpecReadiness(missingSpec).status, "failed");

  const bad99 = mkRoot();
  setup(bad99, `${goodSpec}\nproven 99%\n`);
  assert.strictEqual(validateMasterTruthSpecReadiness(bad99).status, "failed");

  const badProd = mkRoot();
  setup(badProd, `${goodSpec}\nall generated apps are production-ready\n`);
  assert.strictEqual(validateMasterTruthSpecReadiness(badProd).status, "failed");

  const badScreenshot = mkRoot();
  setup(badScreenshot, goodSpec.replace(/sidebar navigation[\s\S]*one-click launch controls/i, "minimal panel list"));
  assert.strictEqual(validateMasterTruthSpecReadiness(badScreenshot).status, "failed");

  const badBoundary = mkRoot();
  setup(badBoundary, goodSpec.replace(/release-candidate foundation/ig, "rc-foundation"));
  assert.strictEqual(validateMasterTruthSpecReadiness(badBoundary).status, "failed");

  console.log("masterTruthSpecReadiness.test.ts passed");
}

run();
