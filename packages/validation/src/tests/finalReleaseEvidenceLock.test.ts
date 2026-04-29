import assert from "assert";
import fs from "fs";
import os from "os";
import path from "path";
import { validateFinalReleaseEvidenceLock } from "../repoValidators/finalReleaseEvidenceLock";

function writeFile(root: string, rel: string, content: string) {
  const full = path.join(root, rel);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content, "utf8");
}

function mkRoot(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "final-release-lock-"));
}

function goodDoc() {
  return `
release-candidate ready
release-candidate foundation evidence only
does not mark the max-power autonomous builder product complete
not a live deployment claim
not a production-ready claim
not a zero leaks proven claim
not a claim that all generated apps are production-ready without validation
no known p0/p1/p2 release-candidate blockers
npm run -s build
npm run -s test:universal
npm run -s validate:all
npm run -s doctor
legal/claim boundary
evidence boundary
ui route proof
generated app corpus
dirty repo evidence
dirty repo completion v2
dirty repo repair-loop proof
self-upgrade safety
secret leak prevention
deployment dry-run
credentialed deployment readiness
live deployment execution boundary
route-level deploy gates
proof-engine claim verification
`;
}

function run() {
  const root = mkRoot();
  writeFile(root, "docs/final-release-evidence-lock.md", goodDoc());
  assert.strictEqual(validateFinalReleaseEvidenceLock(root).status, "passed");

  const liveClaim = mkRoot();
  writeFile(liveClaim, "docs/final-release-evidence-lock.md", `${goodDoc()}\nthis is a live deployment claim\n`);
  assert.strictEqual(validateFinalReleaseEvidenceLock(liveClaim).status, "failed");

  const zeroLeaks = mkRoot();
  writeFile(zeroLeaks, "docs/final-release-evidence-lock.md", `${goodDoc()}\nzero leaks proven\n`);
  assert.strictEqual(validateFinalReleaseEvidenceLock(zeroLeaks).status, "failed");

  const prodReady = mkRoot();
  writeFile(prodReady, "docs/final-release-evidence-lock.md", `${goodDoc()}\nthis is production-ready.\n`);
  assert.strictEqual(validateFinalReleaseEvidenceLock(prodReady).status, "failed");

  const allApps = mkRoot();
  writeFile(allApps, "docs/final-release-evidence-lock.md", `${goodDoc()}\nall generated apps are production-ready without validation\n`);
  assert.strictEqual(validateFinalReleaseEvidenceLock(allApps).status, "failed");

  const repoResult = validateFinalReleaseEvidenceLock(process.cwd());
  assert.strictEqual(repoResult.status, "passed", repoResult.summary);
  console.log("finalReleaseEvidenceLock.test.ts passed");
}

run();
