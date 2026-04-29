import assert from "assert";
import { createUISourcePatchFromSyncPlan } from "../uiSourcePatch";
const plan:any={operations:[{kind:"updateComponentFile",pageIds:["p"],nodeIds:["n"]},{kind:"manualReviewRequired",pageIds:["p"],nodeIds:["n"],reason:"x"}],affectedPageIds:["p"],affectedNodeIds:["n"],caveat:"dry-run/planning only",success:true};
const mapping:any={targets:[{type:"page",sourceId:"p",filePath:"app/p/page.tsx"}],manualReviewRequired:[],caveat:"ok"};
const patch=createUISourcePatchFromSyncPlan(plan,mapping);
assert.ok(patch.operations.every((op:any)=>typeof op==="object"));
assert.ok(patch.caveat.includes("does not prove runtime correctness"));
console.log("uiSourcePatch tests passed");
