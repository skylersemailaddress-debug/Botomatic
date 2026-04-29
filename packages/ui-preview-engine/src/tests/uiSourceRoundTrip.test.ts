import assert from "assert";
import { getUiBlueprint } from "../../../ui-blueprint-registry/src";
import { createEditableUIDocumentFromBlueprint } from "../uiDocumentModel";
import { validateUISourceRoundTrip } from "../uiSourceRoundTrip";
const doc=createEditableUIDocumentFromBlueprint(getUiBlueprint("saasDashboard")!,{now:"2026-01-01T00:00:00.000Z"});
const nodeId=Object.keys(doc.pages[0].nodes)[0];
const ok=validateUISourceRoundTrip(doc,{operations:[{kind:"replaceText",targetFilePath:"src/a.ts",pageIds:[doc.pages[0].id],nodeIds:[nodeId]}],changedFiles:["src/a.ts"],caveat:"x"} as any,{readFile:()=>"",writeFile:()=>{},exists:()=>false});
assert.ok(ok.valid);
const bad=validateUISourceRoundTrip(doc,{operations:[{kind:"replaceText",targetFilePath:"src/a.ts",pageIds:["missing"],nodeIds:["stale"]}],changedFiles:["src/a.ts"],caveat:"x"} as any,{readFile:()=>"",writeFile:()=>{},exists:()=>false});
assert.ok(!bad.valid);
const stale=validateUISourceRoundTrip(doc,{operations:[{kind:"replaceText",targetFilePath:"src/a.ts",pageIds:[doc.pages[0].id],nodeIds:[nodeId],staleIdentity:true}],changedFiles:["src/a.ts"],caveat:"x"} as any,{readFile:()=>"",writeFile:()=>{},exists:()=>false});
assert.ok(!stale.valid);
console.log("uiSourceRoundTrip tests passed");

const mfBad=validateUISourceRoundTrip(doc,{multiFilePlanId:"p1",operations:[{kind:"replaceText",targetFilePath:"src/a.ts",pageIds:[doc.pages[0].id],nodeIds:[nodeId]}],changedFiles:["src/a.ts"],dependencies:[{dependencyEdgeId:"d1",fromFile:"src/a.ts",toFile:"src/missing.ts"}],multiFileRiskLevel:"high",requiresManualReview:false,caveat:"x"} as any,{readFile:()=>"",writeFile:()=>{},exists:()=>false});
assert.ok(!mfBad.valid);
