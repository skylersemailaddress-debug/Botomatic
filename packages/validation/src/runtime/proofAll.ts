import { spawnSync } from "child_process";

const proofs = [
  "proof:greenfield",
  "proof:dirty-repo",
  "proof:self-upgrade",
  "proof:universal-pipeline",
  "proof:domain-scorecards",
  "proof:eval-suite",
  "proof:multi-domain-emitted-output",
  "proof:domain-runtime-commands",
  "proof:external-deployment-readiness",
  "proof:deployment-dry-run",
  "proof:credentialed-deployment-readiness",
  "proof:live-deployment-execution-readiness",
  "proof:secrets-credential-management",
  "proof:autonomous-complex-build",
  "proof:adaptive-repair-strategy",
  "proof:large-file-intake",
  "proof:multi-source-intake",
  "proof:max-power-domain-permutations",
  "proof:live-ui-source-sync-before-export-launch",
  "proof:live-deployment-provider-execution",
  "proof:autobuild-99-statistical",
  "proof:claim-99-independent-audit",
  "proof:claim-99-entitlement",
  "proof:max-power-completion",
];

function run() {
  for (const script of proofs) {
    const result = spawnSync("npm", ["run", "-s", script], {
      cwd: process.cwd(),
      stdio: "inherit",
      encoding: "utf8",
    });

    if ((result.status ?? 1) !== 0) {
      process.exit(result.status ?? 1);
    }
  }

  console.log("All runtime proof harnesses passed.");
}

run();
