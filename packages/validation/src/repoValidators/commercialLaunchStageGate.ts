import fs from "node:fs";
import path from "node:path";
import type { RepoValidatorResult } from "../repoValidators";

const VALIDATOR_NAME = "Validate-Botomatic-CommercialLaunchStageGate";
const MATRIX_PATH = "release-evidence/commercial_launch_stage_matrix.json";
const DOC_PATH = "docs/beta/COMMERCIAL_LAUNCH_STAGE_GATE.md";
const EXPECTED_STAGES = ["local_dev", "friends_family_beta", "paid_beta", "enterprise_pilot", "public_launch"] as const;
const EXPECTED_CATEGORIES = [
  "security",
  "durable_e2e",
  "tenant_isolation",
  "deployment",
  "generated_app_quality",
  "observability",
  "support_runbooks",
  "legal_compliance",
  "billing",
] as const;

type StageId = (typeof EXPECTED_STAGES)[number];
type CategoryId = (typeof EXPECTED_CATEGORIES)[number];

type ProofRequirement = {
  applicable: boolean;
  proofs: string[];
};

type StageMatrixRow = {
  id: StageId;
  requiredProofs: Record<CategoryId, ProofRequirement>;
};

type CommercialLaunchStageMatrix = {
  currentClaimStage: StageId;
  notClaimableStages: StageId[];
  stages: StageMatrixRow[];
};

type StageEvaluation = {
  stage: StageId;
  passed: boolean;
  missingProofs: string[];
};

function has(root: string, rel: string): boolean {
  return fs.existsSync(path.join(root, rel));
}

function read(root: string, rel: string): string {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

function fail(summary: string, checks: string[]): RepoValidatorResult {
  return { name: VALIDATOR_NAME, status: "failed", summary, checks };
}

function pass(summary: string, checks: string[]): RepoValidatorResult {
  return { name: VALIDATOR_NAME, status: "passed", summary, checks };
}

function evaluateStages(root: string, matrix: CommercialLaunchStageMatrix): StageEvaluation[] {
  return matrix.stages.map((stage) => {
    const missingProofs: string[] = [];
    for (const category of EXPECTED_CATEGORIES) {
      const requirement = stage.requiredProofs[category];
      if (!requirement.applicable) continue;
      for (const proof of requirement.proofs) {
        if (!has(root, proof)) missingProofs.push(proof);
      }
    }
    return {
      stage: stage.id,
      passed: missingProofs.length === 0,
      missingProofs,
    };
  });
}

export function validateCommercialLaunchStageGate(root: string): RepoValidatorResult {
  const checks = [MATRIX_PATH, DOC_PATH, "README.md", "MARKETING_CLAIMS_ALLOWED.md", "package.json"];
  const missingChecks = checks.filter((rel) => !has(root, rel));
  if (missingChecks.length > 0) {
    return fail(`Commercial launch stage gate files missing: ${missingChecks.join(", ")}.`, checks);
  }

  const pkg = read(root, "package.json");
  if (!pkg.includes('"validate:commercial-launch"')) {
    return fail("package.json must define validate:commercial-launch command.", checks);
  }

  let matrix: CommercialLaunchStageMatrix;
  try {
    matrix = JSON.parse(read(root, MATRIX_PATH)) as CommercialLaunchStageMatrix;
  } catch {
    return fail("Commercial launch stage matrix must be valid JSON.", checks);
  }

  if (!Array.isArray(matrix.stages) || matrix.stages.length !== EXPECTED_STAGES.length) {
    return fail("Commercial launch stage matrix must define all five launch stages.", checks);
  }

  const matrixStageIds = matrix.stages.map((stage) => stage.id);
  if (JSON.stringify(matrixStageIds) !== JSON.stringify(EXPECTED_STAGES)) {
    return fail(`Commercial launch stage matrix must use explicit ordered stages: ${EXPECTED_STAGES.join(", ")}.`, checks);
  }

  for (const stage of matrix.stages) {
    for (const category of EXPECTED_CATEGORIES) {
      const requirement = stage.requiredProofs?.[category];
      if (!requirement || typeof requirement.applicable !== "boolean" || !Array.isArray(requirement.proofs)) {
        return fail(`Stage ${stage.id} category ${category} must define { applicable, proofs[] } requirements.`, checks);
      }
      if (requirement.applicable && requirement.proofs.length === 0) {
        return fail(`Stage ${stage.id} category ${category} is applicable but has no proof artifacts.`, checks);
      }
    }
  }

  const stageEvaluations = evaluateStages(root, matrix);
  const failedStages = stageEvaluations.filter((stage) => !stage.passed);
  const unprovenStages = failedStages.map((stage) => stage.stage);

  const claimIndex = EXPECTED_STAGES.indexOf(matrix.currentClaimStage);
  if (claimIndex === -1) {
    return fail(`currentClaimStage must be one of: ${EXPECTED_STAGES.join(", ")}.`, checks);
  }
  const highestProvenIndex = stageEvaluations.reduce((acc, stage, idx) => (stage.passed ? idx : acc), -1);
  if (claimIndex > highestProvenIndex) {
    const stageFailure = stageEvaluations.find((stage) => stage.stage === matrix.currentClaimStage);
    return fail(
      `Claimed stage ${matrix.currentClaimStage} is not proven. Missing proofs: ${(stageFailure?.missingProofs ?? []).join(", ") || "unknown"}.`,
      checks
    );
  }

  const sortedNotClaimable = [...(matrix.notClaimableStages ?? [])].sort();
  const sortedUnproven = [...unprovenStages].sort();
  if (JSON.stringify(sortedNotClaimable) !== JSON.stringify(sortedUnproven)) {
    return fail(
      `notClaimableStages must exactly match unproven stages. expected=${sortedUnproven.join(", ") || "none"} actual=${sortedNotClaimable.join(", ") || "none"}.`,
      checks
    );
  }

  const doc = read(root, DOC_PATH);
  const readme = read(root, "README.md");
  const marketing = read(root, "MARKETING_CLAIMS_ALLOWED.md");
  const requiredDocSnippets = [
    `Current commercial launch claim stage: \`${matrix.currentClaimStage}\``,
    `Not currently claimable stages: ${matrix.notClaimableStages.map((stage) => `\`${stage}\``).join(", ") || "none"}`,
  ];

  for (const snippet of requiredDocSnippets) {
    if (!doc.includes(snippet)) {
      return fail(`Commercial launch stage doc must include: ${snippet}`, checks);
    }
    if (!marketing.includes(snippet)) {
      return fail(`Marketing claims doc must include: ${snippet}`, checks);
    }
  }

  if (!readme.includes("COMMERCIAL_LAUNCH_STAGE_GATE.md")) {
    return fail("README.md must reference docs/beta/COMMERCIAL_LAUNCH_STAGE_GATE.md.", checks);
  }

  const blockedSummary = failedStages.length
    ? failedStages.map((stage) => `${stage.stage} (missing ${stage.missingProofs.length})`).join("; ")
    : "none";
  return pass(
    `Commercial launch stage gate is fail-closed: current claim stage ${matrix.currentClaimStage} is proven; blocked stages: ${blockedSummary}.`,
    checks
  );
}
