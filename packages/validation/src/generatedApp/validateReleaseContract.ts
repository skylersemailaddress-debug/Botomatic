import fs from "fs";
import path from "path";

import type { GeneratedAppReleaseContract } from "./releaseContract";

export type ReleaseContractValidationResult = {
  passed: boolean;
  findings: Array<{ field: keyof GeneratedAppReleaseContract; severity: "critical" | "high" | "medium"; message: string }>;
  summary: string;
};

const REQUIRED_STRING_FIELDS: Array<keyof GeneratedAppReleaseContract> = [
  "appId",
  "version",
  "sourceTreePath",
  "readme",
  "installInstructions",
  "envExample",
  "buildCommand",
  "testCommand",
  "runtimeSmokeCommand",
  "deploymentPlan",
  "rollbackPlan",
  "securityNotes",
  "knownLimitations",
  "evidenceManifest",
  "claimBoundary",
];

const PLACEHOLDER_TOKEN_PATTERN = /(?:todo|fixme|<your|your-|example-)/i;

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function validateGeneratedAppReleaseContract(
  contract: GeneratedAppReleaseContract,
  appRootPath: string
): ReleaseContractValidationResult {
  const findings: ReleaseContractValidationResult["findings"] = [];

  REQUIRED_STRING_FIELDS.forEach((field) => {
    if (!asString(contract[field])) {
      findings.push({
        field,
        severity: "critical",
        message: `${field} is required and must be non-empty.`,
      });
    }
  });

  const resolvedReadme = path.resolve(appRootPath, contract.readme || "");
  if (asString(contract.readme) && !fs.existsSync(resolvedReadme)) {
    findings.push({
      field: "readme",
      severity: "critical",
      message: `readme path does not exist: ${contract.readme}`,
    });
  }

  const resolvedEnvExample = path.resolve(appRootPath, contract.envExample || "");
  if (asString(contract.envExample) && !fs.existsSync(resolvedEnvExample)) {
    findings.push({
      field: "envExample",
      severity: "critical",
      message: `envExample path does not exist: ${contract.envExample}`,
    });
  }

  (["buildCommand", "testCommand", "runtimeSmokeCommand"] as const).forEach((field) => {
    const value = asString(contract[field]);
    if (value && PLACEHOLDER_TOKEN_PATTERN.test(value)) {
      findings.push({
        field,
        severity: "high",
        message: `${field} contains placeholder content.`,
      });
    }
  });

  if (!contract.isDemo) {
    const hasDemoOnlyText = REQUIRED_STRING_FIELDS.some((field) => asString(contract[field]).toLowerCase().includes("demo only"));
    if (hasDemoOnlyText) {
      findings.push({
        field: "claimBoundary",
        severity: "high",
        message: "Contract contains 'demo only' language while isDemo is false.",
      });
    }
  }

  if (asString(contract.claimBoundary) && !contract.claimBoundary.toLowerCase().includes("not launch-ready")) {
    findings.push({
      field: "claimBoundary",
      severity: "high",
      message: "claimBoundary must include 'not launch-ready'.",
    });
  }

  if (!asString(contract.evidenceManifest)) {
    findings.push({
      field: "evidenceManifest",
      severity: "critical",
      message: "evidenceManifest must be non-empty.",
    });
  }

  const hasBlockingFindings = findings.some((finding) => finding.severity === "critical" || finding.severity === "high");

  return {
    passed: !hasBlockingFindings,
    findings,
    summary: !hasBlockingFindings
      ? "Generated app release contract passed validation."
      : `Generated app release contract has ${findings.length} finding(s).`,
  };
}
