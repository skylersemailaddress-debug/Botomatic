import assert from "assert";
import { validateFinalReleaseEvidenceLock } from "../repoValidators/finalReleaseEvidenceLock";

function run() {
  const result = validateFinalReleaseEvidenceLock(process.cwd());
  assert.equal(result.status, "passed", result.summary);
  console.log("finalReleaseEvidenceLock.test.ts passed");
}

run();
