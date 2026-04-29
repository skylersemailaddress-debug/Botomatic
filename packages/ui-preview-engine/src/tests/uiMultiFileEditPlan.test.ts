import assert from "assert";
import { createDeterministicMultiFilePlanId } from "../uiMultiFileEditPlan";
const idA=createDeterministicMultiFilePlanId("intent",["b.tsx","a.tsx"],[{operationOrder:1,kind:"update" as const}]);
const idB=createDeterministicMultiFilePlanId("intent",["a.tsx","b.tsx"],[{operationOrder:1,kind:"update" as const}]);
assert.strictEqual(idA,idB);
console.log("uiMultiFileEditPlan.test.ts passed");
