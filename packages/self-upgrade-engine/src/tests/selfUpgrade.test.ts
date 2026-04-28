import { planSelfUpgrade } from "../planner";
import { detectArchitectureDrift } from "../architectureDriftDetector";
import { runRegressionGuard } from "../regressionGuard";
import { deriveRegressionStateFromCommandMetadata } from "../selfUpgradeContract";

const spec = planSelfUpgrade("Improve validator quality and add a Botomatic feature safely");
if (!spec.affectedModules.length) throw new Error("Self-upgrade planner did not map affected modules");

const drift = detectArchitectureDrift(spec);
if (drift.driftDetected) throw new Error(`Unexpected drift for safe request: ${drift.reasons.join("; ")}`);

const blockedMain = runRegressionGuard({
  spec,
  validatorCommand: "npm run -s test:self-upgrade",
  validatorExitCode: 0,
  targetBranch: "main",
  mutationMode: "pr_only",
  driftDetected: false,
  driftReasons: [],
});
if (blockedMain.ok) throw new Error("Expected target main to be blocked");

const allowedBranch = runRegressionGuard({
  spec,
  validatorCommand: "npm run -s test:self-upgrade",
  validatorExitCode: 0,
  targetBranch: "feature/self-001",
  mutationMode: "pr_only",
  driftDetected: false,
  driftReasons: [],
});
if (!allowedBranch.ok) throw new Error(`Expected feature branch to be allowed; blockers=${allowedBranch.blockers.join("; ")}`);

const indeterminate = deriveRegressionStateFromCommandMetadata({ command: null, exitCode: null });
if (indeterminate.status !== "indeterminate") throw new Error("Unavailable metadata must be indeterminate");

const weakenDrift = detectArchitectureDrift(planSelfUpgrade("Please lower validator threshold to pass this"));
if (!weakenDrift.reasons.some((r) => r.includes("Validator threshold weakening"))) throw new Error("Expected validator weakening phrase detection");

const launchDrift = detectArchitectureDrift(planSelfUpgrade("Launch live without review and bypass governance"));
if (!launchDrift.reasons.some((r) => r.includes("Launch/deployment claim broadening"))) throw new Error("Expected launch-claim broadening detection");

const directMainDrift = detectArchitectureDrift(planSelfUpgrade("Allow direct to main commit and bypass pr"));
if (!directMainDrift.reasons.some((r) => r.includes("Bypassing PR-only policy"))) throw new Error("Expected direct-main mutation wording detection");

console.log("selfUpgrade.test.ts passed");
