export type WaveType =
  | "foundation_setup"
  | "data_model"
  | "api_layer"
  | "auth_rbac"
  | "core_business_logic"
  | "frontend_shell"
  | "integrations"
  | "admin_tools"
  | "validation_testing"
  | "deployment"
  | "fresh_clone_proof"
  | "custom";

export interface WaveProofRequirement {
  requirementId: string;
  waveType: WaveType;
  description: string;
  checkType: "file_exists" | "script_passes" | "output_shape" | "artifact_exists" | "test_passes";
  target: string;
  blocking: boolean;
}

export interface WaveProofResult {
  waveId: string;
  waveType: WaveType;
  passed: boolean;
  requirementResults: Array<{
    requirementId: string;
    passed: boolean;
    detail: string;
  }>;
  blockedBy?: string[];
}

export const PROOF_RULES_BY_WAVE_TYPE: Record<WaveType, WaveProofRequirement[]> = {
  foundation_setup: [
    { requirementId: "repo-dirs-exist", waveType: "foundation_setup", description: "Expected directories exist", checkType: "file_exists", target: "package.json", blocking: true },
    { requirementId: "build-passes", waveType: "foundation_setup", description: "Build passes cleanly", checkType: "script_passes", target: "build", blocking: true },
    { requirementId: "scripts-wired", waveType: "foundation_setup", description: "Required package scripts exist", checkType: "output_shape", target: "package.json#scripts", blocking: false },
  ],
  data_model: [
    { requirementId: "schema-files-exist", waveType: "data_model", description: "Schema/entity files exist", checkType: "file_exists", target: "schema/", blocking: true },
    { requirementId: "schema-validates", waveType: "data_model", description: "Schema validator passes", checkType: "script_passes", target: "validate:data-model", blocking: true },
    { requirementId: "migrations-exist", waveType: "data_model", description: "Migration files exist", checkType: "file_exists", target: "migrations/", blocking: false },
  ],
  api_layer: [
    { requirementId: "contract-files-exist", waveType: "api_layer", description: "API contract files exist", checkType: "file_exists", target: "contracts/", blocking: true },
    { requirementId: "contract-tests-pass", waveType: "api_layer", description: "Contract tests pass", checkType: "test_passes", target: "test:contracts", blocking: true },
    { requirementId: "routes-defined", waveType: "api_layer", description: "All routes defined", checkType: "output_shape", target: "api-routes-manifest", blocking: false },
  ],
  auth_rbac: [
    { requirementId: "rbac-tests-pass", waveType: "auth_rbac", description: "RBAC / negative-path tests pass or feature is explicitly excluded", checkType: "test_passes", target: "test:rbac", blocking: true },
    { requirementId: "auth-config-exists", waveType: "auth_rbac", description: "Auth config or exclusion doc exists", checkType: "file_exists", target: "auth/", blocking: true },
  ],
  core_business_logic: [
    { requirementId: "lifecycle-tests-pass", waveType: "core_business_logic", description: "Lifecycle/state machine tests pass", checkType: "test_passes", target: "test:core", blocking: true },
    { requirementId: "workflow-handlers-exist", waveType: "core_business_logic", description: "Workflow handler files exist", checkType: "file_exists", target: "packages/core/", blocking: false },
  ],
  frontend_shell: [
    { requirementId: "app-builds", waveType: "frontend_shell", description: "Application builds successfully", checkType: "script_passes", target: "build", blocking: true },
    { requirementId: "route-smoke-passes", waveType: "frontend_shell", description: "Route smoke test passes", checkType: "test_passes", target: "test:smoke", blocking: true },
    { requirementId: "pages-exist", waveType: "frontend_shell", description: "Core page files exist", checkType: "file_exists", target: "apps/web/", blocking: false },
  ],
  integrations: [
    { requirementId: "adapters-exist", waveType: "integrations", description: "Provider adapters exist or marked config-required", checkType: "file_exists", target: "packages/adapters/", blocking: false },
    { requirementId: "integration-tests-pass", waveType: "integrations", description: "Integration smoke tests pass", checkType: "test_passes", target: "test:integrations", blocking: false },
  ],
  admin_tools: [
    { requirementId: "admin-build-passes", waveType: "admin_tools", description: "Admin console builds", checkType: "script_passes", target: "build", blocking: false },
    { requirementId: "admin-routes-exist", waveType: "admin_tools", description: "Admin routes exist", checkType: "file_exists", target: "apps/web/src/pages/admin/", blocking: false },
  ],
  validation_testing: [
    { requirementId: "validator-output-shape", waveType: "validation_testing", description: "Validator output shape is correct", checkType: "output_shape", target: "validators/", blocking: true },
    { requirementId: "evidence-artifacts", waveType: "validation_testing", description: "Evidence artifacts generated", checkType: "artifact_exists", target: "evidence/", blocking: true },
    { requirementId: "no-mock-pass", waveType: "validation_testing", description: "No validator passes on mock output only", checkType: "test_passes", target: "test:validators", blocking: true },
  ],
  deployment: [
    { requirementId: "dryrun-proof", waveType: "deployment", description: "Dry-run proof exists", checkType: "artifact_exists", target: "evidence/deployment-dryrun", blocking: true },
    { requirementId: "no-live-deploy-claim", waveType: "deployment", description: "No live deployment claim without real proof", checkType: "output_shape", target: "evidence/deployment-status", blocking: true },
    { requirementId: "rollback-exists", waveType: "deployment", description: "Rollback configuration exists", checkType: "file_exists", target: "rollback/", blocking: false },
  ],
  fresh_clone_proof: [
    { requirementId: "install-clean", waveType: "fresh_clone_proof", description: "npm ci succeeds from clean state", checkType: "script_passes", target: "ci", blocking: true },
    { requirementId: "build-clean", waveType: "fresh_clone_proof", description: "Full build passes from clean checkout", checkType: "script_passes", target: "build", blocking: true },
    { requirementId: "tests-pass", waveType: "fresh_clone_proof", description: "Full test suite passes", checkType: "script_passes", target: "test:universal", blocking: true },
    { requirementId: "validate-all", waveType: "fresh_clone_proof", description: "All validators pass", checkType: "script_passes", target: "validate:all", blocking: true },
  ],
  custom: [
    { requirementId: "custom-proof", waveType: "custom", description: "Custom wave proof requirement", checkType: "artifact_exists", target: "evidence/", blocking: false },
  ],
};

export function getProofRules(waveType: WaveType): WaveProofRequirement[] {
  return PROOF_RULES_BY_WAVE_TYPE[waveType] ?? PROOF_RULES_BY_WAVE_TYPE.custom;
}

export function detectWaveType(waveId: string): WaveType {
  const id = waveId.toLowerCase();
  if (/foundation|scaffold|repo_layout|setup/.test(id)) return "foundation_setup";
  if (/data|schema|model|migration|database/.test(id)) return "data_model";
  if (/api|contract|route|endpoint/.test(id)) return "api_layer";
  if (/auth|rbac|permission|role|security/.test(id)) return "auth_rbac";
  if (/core|business|logic|workflow|runtime/.test(id)) return "core_business_logic";
  if (/frontend|ui|shell|web|page/.test(id)) return "frontend_shell";
  if (/integration|adapter|connector|webhook/.test(id)) return "integrations";
  if (/admin|tool|console|monitor/.test(id)) return "admin_tools";
  if (/valid|test|proof|evidence/.test(id)) return "validation_testing";
  if (/deploy|rollback|release|publish/.test(id)) return "deployment";
  if (/fresh|clone|e2e|end.to.end|final/.test(id)) return "fresh_clone_proof";
  return "custom";
}
