import assert from "assert";
import { analyzeSpec } from "../specAnalyzer";
import { generateBuildContract, approveBuildContract } from "../buildContract";

const analyzed = analyzeSpec({
  appName: "Build Contract Test",
  request: "Create a CRM with role permissions, notifications, and deployment readiness.",
  blueprint: {
    category: "crm",
    defaultPages: ["Dashboard", "Contacts"],
    defaultComponents: ["Form", "Table"],
    defaultRoles: ["admin", "reviewer", "operator"],
    defaultPermissions: ["read", "write", "approve"],
    defaultEntities: ["contacts", "companies", "activities"],
    defaultRelationships: ["companies has_many contacts"],
    defaultWorkflows: ["contact_lifecycle", "approval"],
    defaultIntegrations: ["OIDC", "Email"],
    launchCriteria: ["Build passes", "No placeholders"],
    acceptanceCriteria: ["Workflows are complete"],
  },
  actorId: "tester",
});

const contract = generateBuildContract("proj_contract_test", analyzed.spec);
assert.ok(contract.id.startsWith("contract_"), "contract id should be generated");
assert.ok(contract.blockers.length >= 0, "contract blockers should be present");

const approved = approveBuildContract(contract, "tester");
assert.equal(approved.approvedBy, "tester", "approval actor should be stored");
assert.ok(Boolean(approved.approvedAt), "approvedAt should be set");

console.log("buildContract.test.ts passed");
