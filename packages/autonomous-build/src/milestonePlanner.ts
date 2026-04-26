import type { SpecIngestionOutput } from "./specIngestion";

export type MilestoneDefinition = {
  id: string;
  objective: string;
  dependencies: string[];
  artifacts: string[];
  validators: string[];
  proofRequired: string;
  rollbackPoint: string;
  blockerPolicy: "auto_repair_low_medium" | "human_escalation_high_risk";
  doneCriteria: string[];
};

const MILESTONE_ORDER = [
  "foundation_runtime",
  "auth_security",
  "data_model",
  "core_workflows",
  "ui_shell",
  "domain_engines",
  "integrations",
  "testing",
  "deployment",
  "launch_package",
  "final_release_proof",
] as const;

export function createMilestoneGraph(spec: SpecIngestionOutput): MilestoneDefinition[] {
  const baseValidators = [
    "Validate-Botomatic-LaunchReadiness",
    "Validate-Botomatic-Documentation",
  ];

  return MILESTONE_ORDER.map((id, index) => ({
    id,
    objective: `Complete ${id.replace(/_/g, " ")} for complex autonomous build execution.`,
    dependencies: index === 0 ? [] : [MILESTONE_ORDER[index - 1]],
    artifacts: [
      `release-evidence/generated-apps/<project>/milestones/${id}.md`,
      `release-evidence/generated-apps/<project>/milestones/${id}.json`,
    ],
    validators: [
      ...baseValidators,
      ...(id === "launch_package" ? ["Validate-GeneratedAppLaunchPackage"] : []),
      ...(id === "final_release_proof" ? ["Validate-Botomatic-FinalCommercialReleaseEvidence"] : []),
    ],
    proofRequired: `proof_${id}`,
    rollbackPoint: `rollback_after_${id}`,
    blockerPolicy: id === "integrations" || id === "deployment"
      ? "human_escalation_high_risk"
      : "auto_repair_low_medium",
    doneCriteria: [
      `Milestone ${id} artifacts exist`,
      `Milestone ${id} validators pass`,
      spec.initialBuildContract.launchPackageRequired ? "Launch package contract preserved" : "Launch package contract declared",
    ],
  }));
}
