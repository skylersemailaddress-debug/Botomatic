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

  const missingLiveSection = mkRoot();
  setup(missingLiveSection, goodSpec.replace(/## Live visual UI builder truth[\s\S]*?## Canonical workflow/i, "## Canonical workflow"));
  assert.strictEqual(validateMasterTruthSpecReadiness(missingLiveSection).status, "failed");

  const missingRealtimePreview = mkRoot();
  setup(missingRealtimePreview, goodSpec.replace(/The preview must update live in real time when edits are applied\.\n/i, ""));
  assert.strictEqual(validateMasterTruthSpecReadiness(missingRealtimePreview).status, "failed");

  const missingSourceSync = mkRoot();
  setup(missingSourceSync, goodSpec.replace(/Visual edits must sync back to generated source files before export or launch claims\.\n/i, ""));
  assert.strictEqual(validateMasterTruthSpecReadiness(missingSourceSync).status, "failed");

  const missingActualModel = mkRoot();
  setup(missingActualModel, goodSpec.replace(/Edits must apply to an actual generated UI model, not a fake static mock\.\n/i, ""));
  assert.strictEqual(validateMasterTruthSpecReadiness(missingActualModel).status, "failed");

  const missingVoiceSpeechToChat = mkRoot();
  setup(missingVoiceSpeechToChat, goodSpec.replace(/Voice is speech-to-chat input, not a separate product capability\.\n/i, ""));
  assert.strictEqual(validateMasterTruthSpecReadiness(missingVoiceSpeechToChat).status, "failed");

  console.log("masterTruthSpecReadiness.test.ts passed");
}

run();
