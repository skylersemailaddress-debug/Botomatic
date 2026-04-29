import assert from "assert";
import { applyUISourcePatch } from "../uiSourceApply";
const writes:string[]=[];
const fsAdapter={kind:"local" as const,allowWrites:true,readFile:()=>"old",writeFile:(p:string)=>{writes.push(p);},exists:()=>true};
const good:any={operations:[{kind:"replaceText",targetFilePath:"src/a.tsx",pageIds:["p"],nodeIds:["n"],beforeSnippet:"old",afterSnippet:"new",confidence:"high",requiresManualReview:false,sourceKind:"react"}],changedFiles:["src/a.tsx"],caveat:"Patch is a proposed source edit plan and does not prove runtime correctness or deployment readiness."};
assert.ok(applyUISourcePatch(good,fsAdapter,{mode:"dryRun",projectRoot:"."}).ok);
assert.ok(!applyUISourcePatch({...good,operations:[{...good.operations[0],confidence:"low"}]},fsAdapter,{mode:"confirmedApply",projectRoot:".",confirmationMarker:true}).ok);
assert.ok(!applyUISourcePatch({...good,operations:[{...good.operations[0],beforeSnippet:undefined}]},fsAdapter,{mode:"confirmedApply",projectRoot:".",confirmationMarker:true}).ok);
console.log("uiSourceApply tests passed");
