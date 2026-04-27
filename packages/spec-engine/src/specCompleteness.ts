import { MasterSpec, BuildBlockStatus, SpecCompletenessBreakdown } from "./specModel";
import { unresolvedAssumptions } from "./assumptionLedger";
import { isHighRiskField } from "./autonomyPolicy";

function pct(hit: number, total: number): number {
  return Math.max(0, Math.min(100, Math.round((hit / Math.max(1, total)) * 100)));
}

export function computeCompleteness(spec: MasterSpec): SpecCompletenessBreakdown {
  const criticalFields = [spec.appName, spec.appType, spec.coreProblem, spec.coreOutcome, spec.authModel, spec.tenancyModel, spec.deploymentTarget];
  const criticalScore = pct(criticalFields.filter((v) => String(v || "").trim().length > 0).length, criticalFields.length);

  const commercialFields = [spec.businessModel, spec.pricingModel, ...spec.targetUsers, ...spec.customerSegments, ...spec.launchCriteria];
  const commercialScore = pct(commercialFields.filter((v) => String(v || "").trim().length > 0).length, Math.max(8, commercialFields.length));

  const implementationFields = [
    ...spec.pages,
    ...spec.components,
    ...spec.roles,
    ...spec.permissions,
    ...spec.dataEntities,
    ...spec.workflows,
    ...spec.integrations,
  ];
  const implementationScore = pct(implementationFields.filter((v) => String(v || "").trim().length > 0).length, Math.max(20, implementationFields.length));

  const launchFields = [
    ...spec.acceptanceCriteria,
    ...spec.launchCriteria,
    ...spec.securityRequirements,
    ...spec.complianceRequirements,
    ...spec.responsiveRequirements,
    ...spec.accessibilityRequirements,
  ];
  const launchScore = pct(launchFields.filter((v) => String(v || "").trim().length > 0).length, Math.max(16, launchFields.length));

  const riskPenalty = spec.openQuestions.filter((q) => isHighRiskField(q)).length * 8;
  const assumptionPenalty = unresolvedAssumptions(spec.assumptions).length * 10;
  const riskScore = Math.max(0, 100 - riskPenalty - assumptionPenalty);

  return {
    criticalCompleteness: criticalScore,
    commercialCompleteness: commercialScore,
    implementationCompleteness: implementationScore,
    launchCompleteness: launchScore,
    riskCompleteness: riskScore,
  };
}

export function computeBuildBlockStatus(spec: MasterSpec, hasBuildContract: boolean, hasCriticalContradiction: boolean): BuildBlockStatus {
  const readiness = computeCompleteness(spec);
  const unresolvedHighRiskQuestions = spec.openQuestions.filter((q) => isHighRiskField(q)).length;
  const unresolvedHighRiskAssumptions = unresolvedAssumptions(spec.assumptions).length;
  const blockers: string[] = [];

  if (readiness.criticalCompleteness < 95) blockers.push("Critical completeness is below 95.");
  if (readiness.commercialCompleteness < 90) blockers.push("Commercial completeness is below 90.");
  if (unresolvedHighRiskQuestions > 0) blockers.push("High-risk questions remain unresolved.");
  if (unresolvedHighRiskAssumptions > 0) blockers.push("High-risk assumptions require approval.");
  if (!hasBuildContract) blockers.push("Build contract is missing.");
  if (hasCriticalContradiction) blockers.push("Critical contradiction detected in spec.");

  return {
    blocked: blockers.length > 0,
    blockers,
    readiness,
    unresolvedHighRiskQuestions,
    hasBuildContract,
    hasCriticalContradiction,
  };
}
