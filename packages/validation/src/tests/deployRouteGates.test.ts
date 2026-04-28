import assert from "assert";
import fs from "fs";
import path from "path";

const root = process.cwd();
const serverApp = fs.readFileSync(path.join(root, "apps/orchestrator-api/src/server_app.ts"), "utf8");

function run() {
  assert(serverApp.includes("assertProviderPromoteGate"), "promote route must use assertProviderPromoteGate");
  assert(serverApp.includes("assertProviderRollbackGate"), "rollback route must use assertProviderRollbackGate");
  assert(serverApp.includes("provider_handoff_approval_required_false"), "promote gate must block when approvalRequired is false");
  assert(serverApp.includes("provider_secret_linkage_plaintext_secrets_forbidden"), "promote gate must block plaintext secret linkage");
  assert(serverApp.includes("provider_handoff_missing_deploy_command_template"), "promote gate must enforce deploy command template");
  assert(serverApp.includes("provider_rollback_previous_version_reference_required_false"), "rollback gate must enforce previous version reference");
  assert(serverApp.includes("provider_rollback_approval_required_false"), "rollback gate must enforce approval required");
  assert(serverApp.includes("liveExecutionClaimed: false"), "promote response must avoid live deployment success claims");
  assert(serverApp.includes("liveRollbackExecutionClaimed: false"), "rollback response must avoid live rollback success claims");
  assert(serverApp.includes("missing_provider_contract"), "gates must fail closed on missing evidence");
  console.log("deployRouteGates.test.ts passed");
}

run();
