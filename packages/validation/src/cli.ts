import path from "path";
import { runAllRepoValidators } from "./repoValidators";
import {
  computeChecksHash,
  readValidatorCache,
  toCachedResult,
  writeValidatorCache,
  type CachedValidatorResult,
} from "./cache/validatorCache";

type RunMode = "all" | "fast" | "changed";

function parseMode(): RunMode {
  const args = new Set(process.argv.slice(2));
  if (args.has("--changed")) return "changed";
  if (args.has("--fast")) return "fast";
  return "all";
}

function run() {
  const mode = parseMode();
  const root = path.resolve(process.cwd());
  const results = runAllRepoValidators(root);
  const cache = readValidatorCache();
  const nextCacheEntries: CachedValidatorResult[] = [];

  let failed = 0;
  let cachedCount = 0;
  let executedCount = 0;

  const selected = results.filter((result) => {
    const hash = computeChecksHash(root, result.checks);
    const cached = cache.validators[result.name];
    const unchanged = Boolean(cached && cached.hash === hash);

    if (mode === "changed") {
      return !unchanged;
    }

    if (mode === "fast") {
      if (unchanged) {
        cachedCount += 1;
        nextCacheEntries.push(cached);
        return false;
      }
      return true;
    }

    return true;
  });

  const selectedMap = new Map(selected.map((item) => [item.name, item]));

  console.log("\nBotomatic Validation Results\n");

  if (mode === "changed" && selected.length === 0) {
    console.log("PASS — Validate-Changed-Set");
    console.log("  No validator inputs changed since last cached run.");
  }

  for (const r of results) {
    const hash = computeChecksHash(root, r.checks);
    const cached = cache.validators[r.name];
    const shouldExecute = selectedMap.has(r.name) || mode === "all";
    const effective = shouldExecute ? r : cached;

    if (!effective) {
      executedCount += 1;
      nextCacheEntries.push(toCachedResult(r, hash));
      if (r.status === "failed") failed += 1;
      const status = r.status === "passed" ? "PASS" : "FAIL";
      console.log(`${status} — ${r.name}`);
      console.log(`  ${r.summary}`);
      continue;
    }

    if (mode !== "all" && !shouldExecute) {
      const status = effective.status === "passed" ? "PASS" : "FAIL";
      if (effective.status === "failed") failed += 1;
      console.log(`${status} — ${effective.name} (cached)`);
      console.log(`  ${effective.summary}`);
      continue;
    }

    executedCount += 1;
    nextCacheEntries.push(toCachedResult(r, hash));
    const status = r.status === "passed" ? "PASS" : "FAIL";
    if (r.status === "failed") failed += 1;

    console.log(`${status} — ${r.name}`);
    console.log(`  ${r.summary}`);
  }

  writeValidatorCache(nextCacheEntries);

  console.log("\nSummary:");
  console.log(`  Mode: ${mode}`);
  console.log(`  Executed: ${executedCount}`);
  console.log(`  Cached: ${cachedCount}`);
  console.log(`  Passed: ${results.length - failed}`);
  console.log(`  Failed: ${failed}`);

  if (failed > 0) {
    process.exit(1);
  }
}

run();
