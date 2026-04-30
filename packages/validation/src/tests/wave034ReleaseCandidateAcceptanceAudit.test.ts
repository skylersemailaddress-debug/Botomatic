import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const auditPath = path.join(process.cwd(), "release-evidence/rc/WAVE-034_RELEASE_CANDIDATE_ACCEPTANCE_AUDIT.md");
assert(fs.existsSync(auditPath), "missing WAVE-034 release candidate acceptance audit artifact");

const audit = fs.readFileSync(auditPath, "utf8");
for (const marker of [
  "WAVE-034 Release Candidate Acceptance Audit",
  "Final ordered fix list",
  "handoff"
]) {
  assert(audit.includes(marker), `missing audit marker: ${marker}`);
}

console.log("WAVE-034 release candidate acceptance audit checks passed");
