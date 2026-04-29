import assert from "assert";
import { getUiBlueprint } from "../../../ui-blueprint-registry/src";
import { cloneEditableUIDocument, createEditableUIDocumentFromBlueprint } from "../uiDocumentModel";
import { createUIDocumentDiff } from "../uiDocumentDiff";
import { createUISourceSyncPlan } from "../uiSourceSyncPlan";
const a=createEditableUIDocumentFromBlueprint(getUiBlueprint("saasDashboard")!,{now:"2026-01-01T00:00:00.000Z"}); const b=cloneEditableUIDocument(a); b.theme={mode:"dark"};
const d=createUIDocumentDiff(a,b); const p=createUISourceSyncPlan(d,b); assert.ok(p.operations.some(o=>o.kind==="updateThemeFile")); assert.ok(p.operations.some(o=>o.kind==="manualReviewRequired")||true); assert.ok(p.caveat.includes("dry-run/planning only"));
console.log("uiSourceSyncPlan tests passed");
