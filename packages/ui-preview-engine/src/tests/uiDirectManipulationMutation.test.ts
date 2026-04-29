import assert from "assert";
import { getUiBlueprint } from "../../../ui-blueprint-registry/src";
import { createEditableUIDocumentFromBlueprint, validateEditableUIDocument } from "../uiDocumentModel";
import { applyUIDirectManipulation } from "../uiDirectManipulationMutation";

const doc = createEditableUIDocumentFromBlueprint(getUiBlueprint("saasDashboard")!, { now: "2026-01-01T00:00:00.000Z" });
const page = doc.pages[0]; const rootId = page.rootNodeIds[0]!; const [first, second] = page.nodes[rootId].childIds;

const select = applyUIDirectManipulation(doc, { type: "selectNode", pageId: page.id, nodeId: first });
assert.strictEqual(select.status, "applied"); assert.strictEqual(select.selectedNodeId, first); assert.deepStrictEqual(select.nextDocument, doc);

const dupA = applyUIDirectManipulation(doc, { type: "duplicateNode", pageId: page.id, nodeId: first, idSeed: "seed" }, { now: "2026-01-01T00:00:00.000Z" });
const dupB = applyUIDirectManipulation(doc, { type: "duplicateNode", pageId: page.id, nodeId: first, idSeed: "seed" }, { now: "2026-01-01T00:00:00.000Z" });
assert.deepStrictEqual(dupA, dupB); assert.strictEqual(validateEditableUIDocument(dupA.nextDocument).valid, true);

const resized = applyUIDirectManipulation(doc, { type: "resizeNode", pageId: page.id, nodeId: first, width: "10px" });
assert.strictEqual((resized.nextDocument.pages[0].nodes[first].layout.width as string), "10px");
assert.strictEqual((resized.nextDocument.pages[0].nodes[first].props.width as string|undefined), undefined);

assert.strictEqual(applyUIDirectManipulation(doc, { type: "editProp", pageId: page.id, nodeId: first, propName: "nope" as any, value: 1 }).status, "invalid");

const moved = applyUIDirectManipulation(doc, { type: "moveNode", pageId: page.id, nodeId: second, targetParentId: first, targetIndex: 0 });
assert.strictEqual(validateEditableUIDocument(moved.nextDocument).valid, true);

const reordered = applyUIDirectManipulation(moved.nextDocument, { type: "reorderNode", pageId: page.id, nodeId: second, targetParentId: rootId, targetIndex: 0 });
assert.strictEqual(reordered.nextDocument.pages[0].nodes[first].childIds.includes(second), false);
assert.strictEqual(validateEditableUIDocument(reordered.nextDocument).valid, true);

const needsConfirm = applyUIDirectManipulation(doc, { type: "deleteNode", pageId: page.id, nodeId: first });
assert.strictEqual(needsConfirm.status, "needsConfirmation");
assert.deepStrictEqual(needsConfirm.nextDocument, doc);

const deleted = applyUIDirectManipulation(doc, { type: "deleteNode", pageId: page.id, nodeId: first, confirm: true });
for (const n of Object.values(deleted.nextDocument.pages[0].nodes)) { assert.notStrictEqual(n.parentId, first); assert.strictEqual(n.childIds.includes(first), false); }
assert.strictEqual(validateEditableUIDocument(deleted.nextDocument).valid, true);

assert.strictEqual(applyUIDirectManipulation(doc, { type: "deleteNode", pageId: page.id, nodeId: rootId, confirm: true }).status, "blocked");
console.log("uiDirectManipulationMutation tests passed");
