import assert from "assert";
import { normalizeAndValidateUIDataStateApiWiring } from "../uiDataStateApiWiringNormalizer";
import { planUIDataStateApiWiring } from "../uiDataStateApiWiringPlanner";

const normalized = normalizeAndValidateUIDataStateApiWiring({ bindings: [{ bindingId: "b", nodeId: "n1", propertyPath: "text", expression: "state.a" }], stateBindings: [{ stateKey: "a", initialValue: 1, scope: "local", nodeId: "n1" }], stateActions: [{ actionId: "s", actionType: "set", stateKey: "a", triggerNodeId: "n1" }], apiEndpoints: [{ endpointId: "e", method: "DELETE", url: "https://api.example.com/x", externalAllowed: true }], apiRequestBindings: [{ requestBindingId: "r", endpointId: "e", triggerNodeId: "n1", responseMappings: [{ propertyPath: "x", expression: "response.x" }] }] });
const a = planUIDataStateApiWiring(normalized, { editableDocument: { nodes: [{ id: "n1" }], filePath: "src/App.tsx" }, sourceIdentityResult: { identities: [{ sourceIdentityId: "sid1" }] }, multiFilePlanResult: { plan: { planId: "mf1", operations: [{ target: { filePath: "src/App.tsx" } }] } }, fullProjectGenerationPlan: { plan: { planId: "fp1", orderedFilePaths: ["src/App.tsx"] } }, options: { targetFramework: "next", outputMode: "unknown", targetFilePath: "src/App.tsx" } });
const b = planUIDataStateApiWiring(normalized, { editableDocument: { nodes: [{ id: "n1" }], filePath: "src/App.tsx" }, sourceIdentityResult: { identities: [{ sourceIdentityId: "sid1" }] }, multiFilePlanResult: { plan: { planId: "mf1", operations: [{ target: { filePath: "src/App.tsx" } }] } }, fullProjectGenerationPlan: { plan: { planId: "fp1", orderedFilePaths: ["src/App.tsx"] } }, options: { targetFramework: "next", outputMode: "unknown", targetFilePath: "src/App.tsx" } });
assert.strictEqual(a.wiringPlanId, b.wiringPlanId);
assert.deepStrictEqual(a.orderedOperations.map((o) => o.label), ["declare state", "bind state to nodes", "define API client/request helper", "bind request to UI action", "map API response to state/UI"]);
assert.strictEqual(a.affectedNodeIds.length, 1);
assert.strictEqual(a.affectedFilePaths.length, 1);
assert.strictEqual(a.multiFilePlanId, "mf1");
assert.strictEqual(a.fullProjectPlanId, "fp1");
assert.strictEqual(a.sourceIdentityIds?.[0], "sid1");
assert(a.requiresManualReview && a.riskLevel === "high");
assert(a.blockedReasons.some((r) => r.includes("unknown outputMode")));
const missingSource = planUIDataStateApiWiring(normalized, { options: { targetFramework: "next", outputMode: "sourcePatchPlan" } });
assert(missingSource.blockedReasons.some((r) => r.includes("missing source identity")));
console.log("uiDataStateApiWiringPlanner.test.ts passed");
