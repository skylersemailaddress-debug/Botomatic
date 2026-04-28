import fs from "fs";
import path from "path";
import type { RepoValidatorResult } from "../repoValidators";

function has(root: string, rel: string): boolean {
  return fs.existsSync(path.join(root, rel));
}

function read(root: string, rel: string): string {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

export function validateGeneratedAppNoPlaceholderValidatorReadiness(root: string): RepoValidatorResult {
  const checks = [
    "packages/validation/src/generatedApp/validateGeneratedAppNoPlaceholders.ts",
    "packages/validation/src/generatedApp/tests/generatedAppNoPlaceholders.test.ts",
    "docs/generated-app-no-placeholder-validator.md",
    "package.json",
  ];

  if (!checks.every((item) => has(root, item))) {
    return {
      name: "Validate-Botomatic-GeneratedAppNoPlaceholderValidator",
      status: "failed",
      summary: "Generated-app no-placeholder validator module, tests, docs, or script wiring is missing.",
      checks,
    };
  }

  const packageJson = read(root, "package.json");
  const validatorSource = read(root, "packages/validation/src/generatedApp/validateGeneratedAppNoPlaceholders.ts");
  const testSource = read(root, "packages/validation/src/generatedApp/tests/generatedAppNoPlaceholders.test.ts");

  const ok =
    packageJson.includes("test:generated-app-no-placeholders") &&
    packageJson.includes("test:universal") &&
    validatorSource.includes("validateGeneratedAppNoPlaceholders") &&
    validatorSource.includes("scanTests") &&
    validatorSource.includes("includeMarkdown") &&
    testSource.includes("scanTests: true") &&
    testSource.includes("allowlistPaths") &&
    testSource.includes("maxFileSizeBytes");

  return {
    name: "Validate-Botomatic-GeneratedAppNoPlaceholderValidator",
    status: ok ? "passed" : "failed",
    summary: ok
      ? "Generated-app no-placeholder validator is present with tests, docs, and universal test script wiring."
      : "Generated-app no-placeholder validator exists but required options/tests/script wiring are incomplete.",
    checks,
  };
}
