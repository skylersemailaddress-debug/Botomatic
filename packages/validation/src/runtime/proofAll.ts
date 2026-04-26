import { spawnSync } from "child_process";

const proofs = [
  "proof:greenfield",
  "proof:dirty-repo",
  "proof:self-upgrade",
  "proof:universal-pipeline",
  "proof:multi-domain-emitted-output",
  "proof:domain-runtime-commands",
  "proof:external-deployment-readiness",
  "proof:deployment-dry-run",
  "proof:credentialed-deployment-readiness",
  "proof:live-deployment-execution-readiness",
  "proof:secrets-credential-management",
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
