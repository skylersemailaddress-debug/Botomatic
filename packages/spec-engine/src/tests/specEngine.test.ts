import assert from "assert";
import { analyzeSpec } from "../specAnalyzer";
import { computeBuildBlockStatus } from "../specCompleteness";

const sample = analyzeSpec({
  appName: "Spec Engine Test",
  request: "Build a compliance-heavy operations app with RBAC, audit logs, and billing.",
  blueprint: {
    category: "workflow",
    defaultPages: ["Dashboard", "Settings"],
    defaultComponents: ["Form", "Table"],
    defaultRoles: ["admin", "operator"],
    defaultPermissions: ["read", "write"],
    defaultEntities: ["users", "tasks"],
    defaultRelationships: ["users has_many tasks"],
    defaultWorkflows: ["intake", "approval"],
    defaultIntegrations: ["OIDC", "Email"],
    launchCriteria: ["No placeholders", "RBAC enforced"],
    acceptanceCriteria: ["Core workflow ships"],
  },
  actorId: "tester",
});

assert.ok(sample.spec.appName.length > 0, "spec should have app name");
assert.ok(sample.spec.completeness.criticalCompleteness >= 0, "critical completeness should exist");
assert.ok(Array.isArray(sample.clarifications), "clarifications should be an array");

const block = computeBuildBlockStatus(sample.spec, false, false);
assert.equal(block.hasBuildContract, false, "build contract should be required");
assert.ok(block.blocked, "build should be blocked without build contract");

console.log("specEngine.test.ts passed");
