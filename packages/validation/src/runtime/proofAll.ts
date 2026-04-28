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
];

function run() {
  for (const script of proofs) {
    const startedAt = Date.now();
    console.log(`[proof:all] running ${script}...`);

    const result = spawnSync("npm", ["run", "-s", script], {
      cwd: process.cwd(),
      stdio: "inherit",
      encoding: "utf8",
    });

    if ((result.status ?? 1) !== 0) {
      const elapsedMs = Date.now() - startedAt;
      console.error(`[proof:all] failed ${script} after ${elapsedMs}ms.`);
      process.exit(result.status ?? 1);
    }

    const elapsedMs = Date.now() - startedAt;
    console.log(`[proof:all] passed ${script} in ${elapsedMs}ms.`);
  }

  console.log("All runtime proof harnesses passed.");
}

run();
