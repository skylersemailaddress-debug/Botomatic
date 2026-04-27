export type SpecIngestionInput = {
  sourceType: "spec_zip" | "repo_zip" | "messy_notes" | "repo_plus_spec" | "multi_file_spec";
  rawText: string;
  fileNames?: string[];
  existingRepoPath?: string;
};

export type BuildContractSeed = {
  objective: string;
  safetyConstraints: string[];
  launchPackageRequired: true;
  approvalGates: string[];
};

export type SpecIngestionOutput = {
  extractedRequirements: string[];
  productDomains: string[];
  subsystemList: string[];
  risks: string[];
  unknowns: string[];
  requiredSecrets: string[];
  requiredApprovals: string[];
  initialBuildContract: BuildContractSeed;
};

function findMatches(text: string, patterns: RegExp[]): string[] {
  const out = new Set<string>();
  for (const pattern of patterns) {
    const matches = text.match(pattern) || [];
    for (const match of matches) out.add(match.trim());
  }
  return Array.from(out);
}

function splitRequirements(rawText: string): string[] {
  return rawText
    .split(/\n|\.|;|\*/)
    .map((line) => line.trim())
    .filter((line) => line.length > 8)
    .slice(0, 24);
}

export function ingestComplexSpec(input: SpecIngestionInput): SpecIngestionOutput {
  const sourceText = [input.rawText, ...(input.fileNames || [])].join("\n").toLowerCase();

  const extractedRequirements = splitRequirements(input.rawText);

  const productDomains = findMatches(sourceText, [
    /web[_\s-]?saas/g,
    /api[_\s-]?service/g,
    /mobile[_\s-]?app/g,
    /ai[_\s-]?agent/g,
    /game/g,
    /marketing[_\s-]?website/g,
    /bot/g,
    /dirty[_\s-]?repo/g,
  ]).map((v) => v.replace(/[_\s-]+/g, "_"));

  const subsystemList = Array.from(new Set([
    sourceText.includes("auth") ? "auth_security" : "runtime_shell",
    sourceText.includes("database") || sourceText.includes("schema") ? "data_model" : "state_model",
    sourceText.includes("workflow") ? "workflow_engine" : "orchestration_engine",
    sourceText.includes("ui") || sourceText.includes("dashboard") ? "ui_shell" : "control_surface",
    sourceText.includes("integration") ? "integration_layer" : "adapter_layer",
    "launch_package",
    "validation_proof",
  ]));

  const risks = Array.from(new Set([
    sourceText.includes("rewrite") ? "destructive_rewrite_risk" : "scope_drift_risk",
    sourceText.includes("legal") || sourceText.includes("compliance") ? "compliance_risk" : "runtime_change_risk",
    sourceText.includes("live deploy") ? "live_deployment_risk" : "credential_misconfiguration_risk",
  ]));

  const unknowns = [
    sourceText.includes("tbd") ? "tbd_requirements_present" : "integration_specifics_not_finalized",
    sourceText.includes("maybe") ? "ambiguous_feature_priority" : "non_critical_detail_gaps",
  ];

  const requiredSecrets = Array.from(new Set(findMatches(sourceText, [
    /vercel[_\s-]?token/g,
    /supabase[_\s-]?(access[_\s-]?token|db[_\s-]?password)/g,
    /github[_\s-]?token/g,
    /openai[_\s-]?api[_\s-]?key/g,
    /anthropic[_\s-]?api[_\s-]?key/g,
    /stripe[_\s-]?secret[_\s-]?key/g,
  ]).map((value) => value.replace(/[_\s-]+/g, "_") || "runtime_secret_reference")));

  const requiredApprovals = [
    "explicit_live_deployment_approval",
    "paid_provider_action_approval",
    "destructive_rewrite_approval",
  ];

  return {
    extractedRequirements,
    productDomains,
    subsystemList,
    risks,
    unknowns,
    requiredSecrets,
    requiredApprovals,
    initialBuildContract: {
      objective: "Milestone-gated autonomous build execution for complex inputs.",
      safetyConstraints: [
        "No fake completed build claims",
        "No live deployment without explicit approval",
        "No plaintext secrets stored in repo artifacts",
      ],
      launchPackageRequired: true,
      approvalGates: requiredApprovals,
    },
  };
}
