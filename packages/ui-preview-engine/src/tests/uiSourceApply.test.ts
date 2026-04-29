import assert from "assert";
import { applyUISourcePatch } from "../uiSourceApply";

const writes:string[]=[];
const fsAdapter={kind:"local" as const,allowWrites:true,readFile:()=>"old",writeFile:(p:string)=>{writes.push(p);},exists:()=>true};
const good:any={operations:[{kind:"replaceText",targetFilePath:"src/a.ts",pageIds:["p"],nodeIds:["n"],afterSnippet:"new"}],changedFiles:["src/a.ts"],caveat:"Patch is a proposed source edit plan and does not prove runtime correctness or deployment readiness."};
const dry=applyUISourcePatch(good,fsAdapter,{mode:"dryRun",projectRoot:"."}); assert.strictEqual(writes.length,0); assert.ok(dry.ok);
const noConfirm=applyUISourcePatch(good,fsAdapter,{mode:"confirmedApply",projectRoot:"."}); assert.ok(!noConfirm.ok);
const confirmed=applyUISourcePatch(good,fsAdapter,{mode:"confirmedApply",projectRoot:".",confirmationMarker:true}); assert.ok(confirmed.ok); assert.strictEqual(confirmed.writesPerformed,1);
const manual=applyUISourcePatch({...good,operations:[{kind:"manualReviewRequired",targetFilePath:"x",pageIds:[],nodeIds:[]}]},fsAdapter,{mode:"confirmedApply",projectRoot:".",confirmationMarker:true}); assert.ok(!manual.ok);
const blocked=applyUISourcePatch({...good,operations:[{kind:"replaceText",targetFilePath:"release-evidence/runtime/x.json",pageIds:["p"],nodeIds:["n"]}]},fsAdapter,{mode:"confirmedApply",projectRoot:".",confirmationMarker:true}); assert.ok(!blocked.ok);
const traversal=applyUISourcePatch({...good,operations:[{kind:"replaceText",targetFilePath:"../escape.ts",pageIds:["p"],nodeIds:["n"]}]},fsAdapter,{mode:"confirmedApply",projectRoot:"/workspace/Botomatic" ,confirmationMarker:true}); assert.ok(!traversal.ok);
const writesBlocked=applyUISourcePatch(good,{...fsAdapter,allowWrites:false},{mode:"confirmedApply",projectRoot:".",confirmationMarker:true}); assert.ok(!writesBlocked.ok);
console.log("uiSourceApply tests passed");
