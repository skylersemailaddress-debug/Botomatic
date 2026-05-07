export type RuntimeSmokePlan = {
  appId: string;
  smokeCommand: string;
  expectedExitCode: number;
  timeoutMs: number;
  healthEndpoint?: string;
  notes: string;
};

export type RuntimeSmokeValidationResult = {
  passed: boolean;
  findings: Array<{ field: keyof RuntimeSmokePlan; severity: "critical" | "high" | "medium"; message: string }>;
  summary: string;
};

const PLACEHOLDER_TOKEN_PATTERN = /(?:todo|fixme|<your|your-|example-)/i;

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function validateGeneratedAppRuntimeSmoke(
  plan: RuntimeSmokePlan
): RuntimeSmokeValidationResult {
  const findings: RuntimeSmokeValidationResult["findings"] = [];

  if (!asString(plan.appId)) {
    findings.push({
      field: "appId",
      severity: "critical",
      message: "appId must be non-empty.",
    });
  }

  if (!asString(plan.smokeCommand)) {
    findings.push({
      field: "smokeCommand",
      severity: "critical",
      message: "smokeCommand must be non-empty.",
    });
  } else if (PLACEHOLDER_TOKEN_PATTERN.test(plan.smokeCommand)) {
    findings.push({
      field: "smokeCommand",
      severity: "critical",
      message: "smokeCommand contains placeholder content.",
    });
  }

  if (plan.expectedExitCode !== 0) {
    findings.push({
      field: "expectedExitCode",
      severity: "critical",
      message: "expectedExitCode must be 0.",
    });
  }

  if (!Number.isFinite(plan.timeoutMs) || plan.timeoutMs <= 0 || plan.timeoutMs > 120000) {
    findings.push({
      field: "timeoutMs",
      severity: "critical",
      message: "timeoutMs must be > 0 and <= 120000.",
    });
  }

  if (!asString(plan.notes)) {
    findings.push({
      field: "notes",
      severity: "critical",
      message: "notes must be non-empty.",
    });
  }

  const hasCriticalFindings = findings.some((finding) => finding.severity === "critical");

  return {
    passed: !hasCriticalFindings,
    findings,
    summary: !hasCriticalFindings
      ? "Generated app runtime smoke plan passed validation."
      : `Generated app runtime smoke plan has ${findings.length} finding(s).`,
  };
}
