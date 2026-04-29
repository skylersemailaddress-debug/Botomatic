import assert from "assert";
import { getUiBlueprint } from "../../../ui-blueprint-registry/src";
import { cloneEditableUIDocument, createEditableUIDocumentFromBlueprint } from "../uiDocumentModel";
import { parseUIEditCommand } from "../uiEditCommand";
import { resolveUIEditTarget } from "../uiTargetResolver";

const doc = createEditableUIDocumentFromBlueprint(getUiBlueprint("saasDashboard")!, { now: "2026-01-01T00:00:00.000Z" });
const firstNodeId = doc.pages[0].rootNodeIds[0];
assert.strictEqual(resolveUIEditTarget(parseUIEditCommand({ text: "remove this", source: "typedChat" }).command!, doc, { selection: { selectedNodeId: firstNodeId } as any }).status, "resolved");
assert.strictEqual(resolveUIEditTarget(parseUIEditCommand({ text: "remove this", source: "typedChat" }).command!, doc).status, "failed");
assert.strictEqual(resolveUIEditTarget(parseUIEditCommand({ text: `remove node:${firstNodeId}`, source: "typedChat" }).command!, doc).status, "resolved");
assert.strictEqual(resolveUIEditTarget(parseUIEditCommand({ text: "remove node:missing", source: "typedChat" }).command!, doc).status, "failed");
const pageCmd = parseUIEditCommand({ text: "remove the pricing page", source: "typedChat" }).command!; pageCmd.target.reference.pageId = doc.pages[0].id; assert.strictEqual(resolveUIEditTarget(pageCmd, doc).status, "resolved");
const snap = JSON.stringify(doc); resolveUIEditTarget(parseUIEditCommand({ text: "remove this", source: "typedChat" }).command!, doc); assert.strictEqual(JSON.stringify(doc), snap);
const d2 = cloneEditableUIDocument(doc); const ids = d2.pages[0].rootNodeIds; d2.pages[0].nodes[ids[0]].identity.semanticLabel = "dupe"; d2.pages.push(cloneEditableUIDocument(doc).pages[0]); d2.pages[1].nodes[d2.pages[1].rootNodeIds[0]].identity.semanticLabel = "dupe";
const amb = parseUIEditCommand({ text: "remove this", source: "typedChat" }).command!; amb.target.reference.referenceKind = "semanticLabel" as any; amb.target.reference.normalizedReference = "dupe"; assert.strictEqual(resolveUIEditTarget(amb, d2).status, "ambiguous");
const sem = parseUIEditCommand({ text: "remove this", source: "typedChat" }).command!; sem.target.reference.referenceKind = "semanticLabel" as any; sem.target.reference.normalizedReference = doc.pages[0].nodes[firstNodeId].identity.semanticLabel; assert.strictEqual(resolveUIEditTarget(sem, doc).status, "resolved");
assert.strictEqual(resolveUIEditTarget(parseUIEditCommand({ text: "remove thingamabob", source: "typedChat" }).command!, doc).status, "failed");
console.log("uiTargetResolver tests passed");
