import fs from "fs";
import path from "path";
import type { RepoValidatorResult } from "../repoValidators";

function has(root: string, rel: string): boolean {
  return fs.existsSync(path.join(root, rel));
}

function read(root: string, rel: string): string {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

function result(ok: boolean, summary: string, checks: string[]): RepoValidatorResult {
  return {
    name: "Validate-Botomatic-ValidationCacheReadiness",
    status: ok ? "passed" : "failed",
    summary,
    checks,
  };
}

export function validateValidationCacheReadiness(root: string): RepoValidatorResult {
  const checks = [
    "package.json",
    "packages/validation/src/cache/validatorCache.ts",
    "packages/validation/src/cache/clearCache.ts",
    "packages/validation/src/cli.ts",
    "packages/validation/src/runtime/proofFast.ts",
  ];

  if (!checks.every((rel) => has(root, rel))) {
    return result(false, "Validation cache files and scripts are incomplete.", checks);
  }

  const pkg = JSON.parse(read(root, "package.json"));
  const scripts = pkg?.scripts || {};
  const cli = read(root, "packages/validation/src/cli.ts");

  const ok =
    Boolean(scripts["validate:fast"]) &&
    Boolean(scripts["validate:changed"]) &&
    Boolean(scripts["proof:fast"]) &&
    Boolean(scripts["cache:clear"]) &&
    cli.includes("computeChecksHash") &&
    cli.includes("readValidatorCache") &&
    cli.includes("writeValidatorCache");

  return result(
    ok,
    ok
      ? "Fast validation and content-hash cache commands are wired (validate:fast, validate:changed, proof:fast, cache:clear)."
      : "Fast validation/cache command wiring is incomplete.",
    checks
  );
}
