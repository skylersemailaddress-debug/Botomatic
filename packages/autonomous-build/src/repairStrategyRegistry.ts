import type { FailureCategory } from "./failurePolicy";

export type StrategyRiskLevel = "low" | "medium" | "high";

export type StrategyTarget =
  | "generated_output"
  | "launch_capsule"
  | "build_contract"
  | "botomatic_source";

export type RepairStrategy = {
  strategyId: string;
  name: string;
  appliesToCategories: FailureCategory[];
  appliesToSubsystemPatterns: string[];
  appliesToFilePatterns: string[];
  riskLevel: StrategyRiskLevel;
  allowedTargets: StrategyTarget[];
  requiresApproval: boolean;
  preconditions: string[];
  repairActionDescription: string;
  validationCommandAfterRepair: string;
  rollbackInstructions: string;
  successSignals: string[];
  failureSignals: string[];
};

export const REPAIR_STRATEGY_REGISTRY: RepairStrategy[] = [
  {
    strategyId: "add_missing_file",
    name: "Add Missing File",
    appliesToCategories: ["generated_app_implementation_failure", "validation_contract_failure"],
    appliesToSubsystemPatterns: ["generated-app", "launch", "capsule"],
    appliesToFilePatterns: ["missing", "not found", "launch-capsule", "launch-package", "env.example"],
    riskLevel: "low",
    allowedTargets: ["generated_output", "launch_capsule"],
    requiresApproval: false,
    preconditions: ["Required file is absent", "File target is generated output or launch capsule"],
    repairActionDescription: "Create required missing generated/launch file using contract-safe template.",
    validationCommandAfterRepair: "validate:targeted && validate:all_if_launch_critical",
    rollbackInstructions: "Remove newly added generated/launch files created by this strategy.",
    successSignals: ["Required file exists", "Target validator passes"],
    failureSignals: ["File still missing", "Validator still failing"],
  },
  {
    strategyId: "fix_import_or_export",
    name: "Fix Import or Export",
    appliesToCategories: ["generated_app_implementation_failure"],
    appliesToSubsystemPatterns: ["typescript", "javascript", "module", "router", "component"],
    appliesToFilePatterns: ["cannot find module", "import", "export", "index.ts", "index.js"],
    riskLevel: "low",
    allowedTargets: ["generated_output"],
    requiresApproval: false,
    preconditions: ["Build error indicates missing import/export", "Target file is generated output"],
    repairActionDescription: "Correct module import/export paths and index exports in generated output.",
    validationCommandAfterRepair: "npm run -s build && npm run -s test:universal",
    rollbackInstructions: "Revert generated output files touched by import/export repair.",
    successSignals: ["Build passes", "Module resolves correctly"],
    failureSignals: ["Same module resolution error persists"],
  },
  {
    strategyId: "repair_schema_mismatch",
    name: "Repair Schema Mismatch",
    appliesToCategories: ["generated_app_implementation_failure", "validation_contract_failure"],
    appliesToSubsystemPatterns: ["db", "schema", "api", "entity"],
    appliesToFilePatterns: ["schema", "migration", "entity", "field", "response"],
    riskLevel: "medium",
    allowedTargets: ["generated_output"],
    requiresApproval: false,
    preconditions: ["Schema or API field mismatch detected", "Generated output model can be reconciled"],
    repairActionDescription: "Align generated schema/entity contracts with expected API and validator contract.",
    validationCommandAfterRepair: "npm run -s build && npm run -s test:universal",
    rollbackInstructions: "Revert schema/entity changes in generated output files for this attempt.",
    successSignals: ["Schema/API tests pass", "Contract mismatch resolved"],
    failureSignals: ["Schema mismatch remains", "Contract tests fail"],
  },
  {
    strategyId: "complete_launch_capsule",
    name: "Complete Launch Capsule",
    appliesToCategories: ["validation_contract_failure", "generated_app_implementation_failure"],
    appliesToSubsystemPatterns: ["launch", "capsule", "packet", "checkpoint", "milestone"],
    appliesToFilePatterns: ["launch-capsule", "runbook", "env.example", "launch packet", "checkpoint"],
    riskLevel: "low",
    allowedTargets: ["launch_capsule"],
    requiresApproval: false,
    preconditions: ["Launch capsule artifact(s) missing or malformed"],
    repairActionDescription: "Generate missing launch capsule docs/scripts/env/packet/checkpoint artifacts.",
    validationCommandAfterRepair: "validate:launch_capsule && no_placeholder_scan",
    rollbackInstructions: "Revert launch capsule files touched by this completion pass.",
    successSignals: ["Launch capsule validator passes", "No placeholder scan passes"],
    failureSignals: ["Launch capsule validator still fails"],
  },
  {
    strategyId: "replace_placeholder_output",
    name: "Replace Placeholder Output",
    appliesToCategories: ["validation_contract_failure", "generated_app_implementation_failure"],
    appliesToSubsystemPatterns: ["generated-app", "launch", "placeholder"],
    appliesToFilePatterns: ["todo", "placeholder", "fake integration", "coming soon"],
    riskLevel: "medium",
    allowedTargets: ["generated_output", "launch_capsule"],
    requiresApproval: false,
    preconditions: ["Placeholder/fake output detected by validator or scan"],
    repairActionDescription: "Replace placeholders with concrete generated output aligned to launch contract.",
    validationCommandAfterRepair: "no_placeholder_scan && npm run -s test:universal",
    rollbackInstructions: "Revert generated/launch files touched while replacing placeholders.",
    successSignals: ["No placeholder scan passes", "Relevant tests pass"],
    failureSignals: ["Placeholder markers remain"],
  },
  {
    strategyId: "apply_safe_default_assumption",
    name: "Apply Safe Default Assumption",
    appliesToCategories: ["build_contract_ambiguity"],
    appliesToSubsystemPatterns: ["build-contract", "planning", "assumption"],
    appliesToFilePatterns: ["ambiguous", "unspecified", "contract"],
    riskLevel: "medium",
    allowedTargets: ["build_contract"],
    requiresApproval: false,
    preconditions: ["Documented safe default exists for the unresolved ambiguity"],
    repairActionDescription: "Record safe default assumption, update assumption ledger, and regenerate plan.",
    validationCommandAfterRepair: "assumption_ledger_check && plan_regeneration",
    rollbackInstructions: "Remove assumption entry and restore prior build contract decision state.",
    successSignals: ["Assumption ledger updated", "Plan regenerated without ambiguity blocker"],
    failureSignals: ["Ambiguity remains unresolved"],
  },
  {
    strategyId: "split_large_input",
    name: "Split Large Input",
    appliesToCategories: ["resource_limit_failure", "external_provider_unavailable"],
    appliesToSubsystemPatterns: ["intake", "upload", "extract", "planning"],
    appliesToFilePatterns: ["upload too large", "extraction limit", "network", "provider unavailable"],
    riskLevel: "low",
    allowedTargets: ["build_contract"],
    requiresApproval: false,
    preconditions: ["Failure indicates size/network pressure and alternate intake path is available"],
    repairActionDescription: "Split input and route through local manifest/alternate intake before provider-dependent path.",
    validationCommandAfterRepair: "intake_proof && source_manifest_validation",
    rollbackInstructions: "Revert intake split plan and return to original intake manifest.",
    successSignals: ["Intake succeeds via alternate path", "Manifest validates"],
    failureSignals: ["Intake still blocked by size/provider issues"],
  },
  {
    strategyId: "reduce_concurrency_and_resume",
    name: "Reduce Concurrency and Resume",
    appliesToCategories: ["resource_limit_failure"],
    appliesToSubsystemPatterns: ["runtime", "memory", "process"],
    appliesToFilePatterns: ["137", "out of memory", "killed"],
    riskLevel: "low",
    allowedTargets: ["build_contract"],
    requiresApproval: false,
    preconditions: ["Runtime failed due to resource pressure (e.g. exit 137)"],
    repairActionDescription: "Lower concurrency, checkpoint, and resume milestone execution safely.",
    validationCommandAfterRepair: "resume_run && npm run -s build && npm run -s test:universal",
    rollbackInstructions: "Restore prior concurrency settings and resume policy.",
    successSignals: ["Run resumes", "Build/test pass after resume"],
    failureSignals: ["Process still exits due to resource pressure"],
  },
  {
    strategyId: "clean_port_and_restart",
    name: "Clean Port and Restart",
    appliesToCategories: ["resource_limit_failure"],
    appliesToSubsystemPatterns: ["local runtime", "network", "server"],
    appliesToFilePatterns: ["port already in use", "eaddrinuse"],
    riskLevel: "low",
    allowedTargets: ["build_contract"],
    requiresApproval: false,
    preconditions: ["Port conflict detected in local runtime"],
    repairActionDescription: "Clear conflicting process/port binding and restart local runtime health path.",
    validationCommandAfterRepair: "npm run -s doctor && health_check",
    rollbackInstructions: "Restart previous process state if conflict cleanup fails.",
    successSignals: ["Port conflict resolved", "Health check passes"],
    failureSignals: ["Port remains occupied"],
  },
  {
    strategyId: "route_to_vault_setup",
    name: "Route to Vault Setup",
    appliesToCategories: ["missing_secret_or_credential"],
    appliesToSubsystemPatterns: ["secrets", "credentials", "vault"],
    appliesToFilePatterns: ["token", "key", "secret", "credential"],
    riskLevel: "low",
    allowedTargets: ["build_contract"],
    requiresApproval: false,
    preconditions: ["Missing credential blocks provider/local preflight"],
    repairActionDescription: "Route to Vault-based credential setup workflow; never request plaintext secrets in chat.",
    validationCommandAfterRepair: "secret_preflight_status",
    rollbackInstructions: "Clear unresolved secret references and maintain blocked live/provider path.",
    successSignals: ["Preflight reports required secrets present"],
    failureSignals: ["Secrets remain missing"],
  },
  {
    strategyId: "stop_for_builder_defect",
    name: "Stop for Builder Defect",
    appliesToCategories: ["botomatic_builder_defect"],
    appliesToSubsystemPatterns: ["botomatic", "orchestrator", "validator", "routing"],
    appliesToFilePatterns: ["builder defect", "routing regression", "obsolete marker"],
    riskLevel: "high",
    allowedTargets: ["botomatic_source"],
    requiresApproval: true,
    preconditions: ["Defect is in Botomatic machinery, not generated output"],
    repairActionDescription: "Stop automatic repair and request explicit approval before any self-upgrade operation.",
    validationCommandAfterRepair: "approval_gate_check",
    rollbackInstructions: "No automatic code mutation; keep run paused pending approval.",
    successSignals: ["Approval received for manual/self-upgrade path"],
    failureSignals: ["No approval available"],
  },
];

export function getRepairStrategyById(strategyId: string): RepairStrategy | undefined {
  return REPAIR_STRATEGY_REGISTRY.find((strategy) => strategy.strategyId === strategyId);
}
