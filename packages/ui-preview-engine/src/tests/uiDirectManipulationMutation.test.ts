import assert from "assert";
import { getUiBlueprint } from "../../../ui-blueprint-registry/src";
import { createEditableUIDocumentFromBlueprint } from "../uiDocumentModel";
import { applyUIDirectManipulation } from "../uiDirectManipulationMutation";

const doc = createEditableUIDocumentFromBlueprint(getUiBlueprint("saasDashboard")!, { now: "2026-01-01T00:00:00.000Z" });
const page = doc.pages[0];
const rootId = page.rootNodeIds[0]!;
const [first, second] = page.nodes[rootId].childIds;

const reordered = applyUIDirectManipulation(doc, { type: "reorderNode", pageId: page.id, nodeId: second, targetParentId: rootId, targetIndex: 0 });
assert.strictEqual(reordered.status, "applied");
assert.deepStrictEqual(reordered.nextDocument.pages[0].nodes[rootId].childIds.slice(0, 2), [second, first]);

const noConfirmDelete = applyUIDirectManipulation(doc, { type: "deleteNode", pageId: page.id, nodeId: first });
assert.strictEqual(noConfirmDelete.status, "invalid");

const duplicateA = applyUIDirectManipulation(doc, { type: "duplicateNode", pageId: page.id, nodeId: first, idSeed: "seed-1" });
const duplicateB = applyUIDirectManipulation(doc, { type: "duplicateNode", pageId: page.id, nodeId: first, idSeed: "seed-1" });
assert.deepStrictEqual(duplicateA.changedNodeIds, duplicateB.changedNodeIds);

console.log("uiDirectManipulationMutation tests passed");
