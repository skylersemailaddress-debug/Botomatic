import { createProofEntry } from "../proofLedger";
import { verifyClaim } from "../claimVerifier";

const good = createProofEntry({
  scope: "self_upgrade",
  claim: "Self-upgrade completed safely",
  evidence: ["commit abc123", "validator output"],
  validatorSummary: "validate:all pass",
  outcome: "passed",
  rollbackPlan: "git revert abc123",
});

const checked = verifyClaim(good);
if (!checked.ok) {
  throw new Error(`Expected claim verifier pass, got blockers: ${checked.blockers.join("; ")}`);
}

console.log("claimVerifier.test.ts passed");
