import assert from "assert";
import { createUISourcePatchFromSyncPlan, validateUISourcePatch } from "../uiSourcePatch";
const plan:any={operations:[{kind:"updateComponentFile",pageIds:["p"],nodeIds:["n"]}],affectedPageIds:["p"],affectedNodeIds:["n"],caveat:"dry-run/planning only",success:true};
const mapping:any={targets:[{type:"page",sourceId:"p",filePath:"app/p/page.tsx"}],manualReviewRequired:[],caveat:"ok"};
const patch=createUISourcePatchFromSyncPlan(plan,mapping);
assert.strictEqual(patch.operations[0].confidence,"medium");
const invalid=validateUISourcePatch({...patch,operations:[{...patch.operations[0],kind:"replaceText",beforeSnippet:undefined}]});
assert.ok(!invalid.valid);
console.log("uiSourcePatch tests passed");
