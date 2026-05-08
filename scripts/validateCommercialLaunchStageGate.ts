import fs from "node:fs";
import path from "node:path";
import { validateCommercialLaunchStageGate } from "../packages/validation/src/repoValidators/commercialLaunchStageGate";

const ROOT = process.cwd();
const MATRIX_PATH = "release-evidence/runtime/commercial_launch_stage_matrix.json";
const OUTPUT_PATH = "release-evidence/runtime/commercial_launch_stage_gate.json";
const STAGE_ORDER = ["local_dev", "friends_family_beta", "paid_beta", "enterprise_pilot", "public_launch"] as const;

type StageEvaluation = {
  stage: string;
  passed: boolean;
  missingProofs: string[];
};

function has(rel: string): boolean {
  return fs.existsSync(path.join(ROOT, rel));
}

function read(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

function evaluateStages(matrix: any): StageEvaluation[] {
  const stages = Array.isArray(matrix?.stages) ? matrix.stages : [];
  return stages.map((stage: any) => {
    const requiredProofs = stage?.requiredProofs && typeof stage.requiredProofs === "object" ? stage.requiredProofs : {};
    const missingProofs: string[] = [];
    for (const category of Object.keys(requiredProofs)) {
      const requirement = requiredProofs[category];
      if (!requirement || requirement.applicable !== true) continue;
      const proofs = Array.isArray(requirement.proofs) ? requirement.proofs : [];
      for (const proof of proofs) {
        if (typeof proof === "string" && !has(proof)) missingProofs.push(proof);
      }
    }
    return {
      stage: String(stage?.id ?? "unknown"),
      passed: missingProofs.length === 0,
      missingProofs,
    };
  });
}

function main() {
  const result = validateCommercialLaunchStageGate(ROOT);
  let matrix: any = {};
  try {
    matrix = JSON.parse(read(MATRIX_PATH));
  } catch {
    // ignore; validator already reports parsing errors
  }

  const stageEvaluations = evaluateStages(matrix);
  const highestProvenStage = [...stageEvaluations].reverse().find((stage) => stage.passed)?.stage ?? null;
  const gateOutput = {
    gate: "commercial_launch_stage_gate",
    generatedAt: new Date().toISOString(),
    validator: result.name,
    status: result.status,
    summary: result.summary,
    currentClaimStage: matrix?.currentClaimStage ?? null,
    notClaimableStages: Array.isArray(matrix?.notClaimableStages) ? matrix.notClaimableStages : [],
    highestProvenStage,
    stageOrder: STAGE_ORDER,
    stageEvaluations,
  };

  fs.mkdirSync(path.dirname(path.join(ROOT, OUTPUT_PATH)), { recursive: true });
  fs.writeFileSync(path.join(ROOT, OUTPUT_PATH), `${JSON.stringify(gateOutput, null, 2)}\n`, "utf8");

  if (result.status === "failed") {
    console.error(result.name);
    console.error(result.summary);
    console.error(`Gate output written to ${OUTPUT_PATH}`);
    process.exit(1);
  }

  console.log(result.name);
  console.log(result.summary);
  console.log(`Gate output written to ${OUTPUT_PATH}`);
}

main();

