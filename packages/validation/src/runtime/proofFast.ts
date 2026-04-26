import { spawnSync } from "child_process";

const proofs = [
  "proof:greenfield",
  "proof:dirty-repo",
  "proof:secrets-credential-management",
  "proof:autonomous-complex-build",
  "proof:domain-scorecards",
  "proof:eval-suite",
];

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

console.log("Fast runtime proof suite passed.");
