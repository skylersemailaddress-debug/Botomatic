import assert from "assert";
import { UI_DATA_STATE_API_WIRING_CAVEAT, type UIDataStateApiWiringPlan } from "../uiDataStateApiWiringModel";

const plan: UIDataStateApiWiringPlan = { wiringPlanId: "w", bindings: [], stateBindings: [], stateActions: [], apiEndpoints: [], apiRequestBindings: [], affectedNodeIds: [], affectedFilePaths: [], orderedOperations: [{ order: 1, label: "declare state" }, { order: 2, label: "bind state to nodes" }, { order: 3, label: "define API client/request helper" }, { order: 4, label: "bind request to UI action" }, { order: 5, label: "map API response to state/UI" }], riskLevel: "low", requiresManualReview: false, blockedReasons: [], caveat: UI_DATA_STATE_API_WIRING_CAVEAT };
assert(plan.caveat.includes("deterministic dry-run planning"));
assert.strictEqual(plan.orderedOperations.length, 5);
console.log("uiDataStateApiWiringModel.test.ts passed");
