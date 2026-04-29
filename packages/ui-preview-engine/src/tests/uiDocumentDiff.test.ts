import assert from "assert";
import { getUiBlueprint } from "../../../ui-blueprint-registry/src";
import { cloneEditableUIDocument, createEditableUIDocumentFromBlueprint } from "../uiDocumentModel";
import { createUIDocumentDiff, summarizeUIDocumentDiff } from "../uiDocumentDiff";
const a=createEditableUIDocumentFromBlueprint(getUiBlueprint("saasDashboard")!,{now:"2026-01-01T00:00:00.000Z"}); const b=cloneEditableUIDocument(a); b.theme={mode:"dark"}; b.pages.push({id:"p2",route:"/p2",name:"p2",title:"p2",rootNodeIds:[],nodes:{}} as any); const node=b.pages[0].nodes[b.pages[0].rootNodeIds[0]].childIds[0]; b.pages[0].nodes[node].props.text="hello"; b.pages[0].nodes[node].style.color="red" as any; b.pages[0].nodes[node].layout.columns=2 as any; b.pages[0].nodes[node].bindings=[{key:"x",source:"y"}];
const d=createUIDocumentDiff(a,b); assert.ok(d.operations.some(o=>o.kind==="themeUpdated")); assert.ok(d.operations.some(o=>o.kind==="pageAdded")); assert.ok(d.operations.some(o=>o.kind==="textUpdated")); assert.ok(d.operations.some(o=>o.kind==="styleUpdated")); assert.ok(d.operations.some(o=>o.kind==="layoutUpdated")); assert.ok(d.operations.some(o=>o.kind==="bindingUpdated")); assert.strictEqual(summarizeUIDocumentDiff(d),summarizeUIDocumentDiff(d));
console.log("uiDocumentDiff tests passed");
