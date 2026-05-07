import type { GeneratedAppEvidenceBundle } from "./evidenceBundle";

export type EvidenceBundleValidationResult = {
  passed: boolean;
  findings: Array<{ field: string; severity: "critical" | "high" | "medium" | "low"; message: string }>;
  summary: string;
};

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isParseableDate(value: string): boolean {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed);
}

export function validateGeneratedAppEvidenceBundle(
  bundle: GeneratedAppEvidenceBundle
): EvidenceBundleValidationResult {
  const findings: EvidenceBundleValidationResult["findings"] = [];

  if (bundle.schemaVersion !== "1") {
    findings.push({
      field: "schemaVersion",
      severity: "critical",
      message: "schemaVersion must be '1'.",
    });
  }

  if (!isNonEmptyString(bundle.appId)) {
    findings.push({
      field: "appId",
      severity: "critical",
      message: "appId must be non-empty.",
    });
  }

  if (!isNonEmptyString(bundle.generatedAt) || !isParseableDate(bundle.generatedAt)) {
    findings.push({
      field: "generatedAt",
      severity: "critical",
      message: "generatedAt must be a parseable ISO date string.",
    });
  }

  if (!isNonEmptyString(bundle.nodeVersion)) {
    findings.push({
      field: "nodeVersion",
      severity: "high",
      message: "nodeVersion must be non-empty.",
    });
  }

  if (!isNonEmptyString(bundle.npmVersion)) {
    findings.push({
      field: "npmVersion",
      severity: "high",
      message: "npmVersion must be non-empty.",
    });
  }

  if (bundle.overallPass) {
    const requiredPassFlags: Array<keyof GeneratedAppEvidenceBundle["passFail"]> = [
      "install",
      "build",
      "runtimeSmoke",
      "noSecrets",
      "noPlaceholders",
    ];

    requiredPassFlags.forEach((flag) => {
      if (!bundle.passFail[flag]) {
        findings.push({
          field: `passFail.${flag}`,
          severity: "critical",
          message: `overallPass cannot be true when passFail.${flag} is false.`,
        });
      }
    });
  }

  if (!Array.isArray(bundle.caveats) || bundle.caveats.length === 0) {
    findings.push({
      field: "caveats",
      severity: "high",
      message: "caveats must be a non-empty array.",
    });
  } else if (!bundle.caveats.some((caveat) => caveat.toLowerCase().includes("not launch-readiness proof"))) {
    findings.push({
      field: "caveats",
      severity: "high",
      message: "caveats must include language indicating it is not launch-readiness proof.",
    });
  }

  const hasBlockingFindings = findings.some((finding) => finding.severity === "critical" || finding.severity === "high");

  return {
    passed: !hasBlockingFindings,
    findings,
    summary: !hasBlockingFindings
      ? "Generated app evidence bundle passed validation."
      : `Generated app evidence bundle has ${findings.length} finding(s).`,
  };
}
