import fs from "fs";
import path from "path";

import type { RepoValidatorResult } from "../repoValidators";

function has(root: string, rel: string): boolean {
  return fs.existsSync(path.join(root, rel));
}

function read(root: string, rel: string): string {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

export function validateGeneratedAppCommercialReadinessGateReadiness(root: string): RepoValidatorResult {
  const checks = [
    "packages/validation/src/generatedApp/validateGeneratedAppCommercialReadiness.ts",
    "packages/validation/src/generatedApp/tests/generatedAppCommercialReadiness.test.ts",
    "docs/generated-app-commercial-readiness-gate.md",
    "package.json",
  ];

  if (!checks.every((rel) => has(root, rel))) {
    return {
      name: "Validate-Botomatic-GeneratedAppCommercialReadinessGate",
      status: "failed",
      summary: "Generated-app commercial readiness gate module/tests/docs/script wiring is missing.",
      checks,
    };
  }

  const source = read(root, "packages/validation/src/generatedApp/validateGeneratedAppCommercialReadiness.ts");
  const tests = read(root, "packages/validation/src/generatedApp/tests/generatedAppCommercialReadiness.test.ts");
  const packageJson = read(root, "package.json");

  const requiredGates = [
    "file_structure",
    "installability_manifest",
    "build_script_presence",
    "test_script_presence",
    "no_placeholder_scan",
    "route_or_entrypoint_presence",
    "data_model_or_storage_plan",
    "auth_boundary_plan",
    "integration_boundary_plan",
    "accessibility_notes",
    "responsive_ui_notes",
    "error_empty_loading_states",
    "security_notes",
    "deployment_plan",
    "legal_claim_boundary",
  ];

  const statusTokensPresent =
    source.includes('"blocked"') &&
    source.includes('"preview_ready"') &&
    source.includes('"candidate_ready"') &&
    !source.includes('"launch_ready"') &&
    !source.includes('"production_ready"');

  const requiredGateTokensPresent = requiredGates.every((gate) => source.includes(gate));

  const ok =
    source.includes("validateGeneratedAppCommercialReadiness") &&
    source.includes("validateGeneratedAppNoPlaceholders") &&
    requiredGateTokensPresent &&
    statusTokensPresent &&
    tests.includes("candidate_ready") &&
    tests.includes("preview_ready") &&
    tests.includes("blocked") &&
    tests.includes("not launch-readiness proof") &&
    packageJson.includes("test:generated-app-commercial-readiness") &&
    packageJson.includes("test:universal");

  return {
    name: "Validate-Botomatic-GeneratedAppCommercialReadinessGate",
    status: ok ? "passed" : "failed",
    summary: ok
      ? "Generated-app commercial readiness gate is present with required statuses, gates, tests, docs, and script wiring."
      : "Generated-app commercial readiness gate exists but required statuses/gates/tests/docs/script wiring are incomplete.",
    checks,
  };
}
