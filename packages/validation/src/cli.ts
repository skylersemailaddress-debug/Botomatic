import path from "path";
import { runAllRepoValidators } from "./repoValidators";

function run() {
  const root = path.resolve(process.cwd());
  const results = runAllRepoValidators(root);

  let failed = 0;

  console.log("\nBotomatic Validation Results\n");

  for (const r of results) {
    const status = r.status === "passed" ? "PASS" : "FAIL";
    if (r.status === "failed") failed += 1;

    console.log(`${status} — ${r.name}`);
    console.log(`  ${r.summary}`);
  }

  console.log("\nSummary:");
  console.log(`  Passed: ${results.length - failed}`);
  console.log(`  Failed: ${failed}`);

  if (failed > 0) {
    process.exit(1);
  }
}

run();
