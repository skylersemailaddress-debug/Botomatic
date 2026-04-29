import assert from "assert";
import { getUiBlueprint, type UIBlueprint } from "../../../ui-blueprint-registry/src";
import {
  EDITABLE_UI_DOCUMENT_CAVEAT,
  assertNodeIdentityStableBeforeAfter,
  cloneEditableUIDocument,
  createEditableUIDocumentFromBlueprint,
  findNodeById,
  flattenEditableNodes,
  parseEditableUIDocument,
  serializeEditableUIDocument,
  validateEditableUIDocument,
} from "../uiDocumentModel";

const blueprint = getUiBlueprint("saasDashboard");
assert.ok(blueprint);
const inputSnapshot = JSON.stringify(blueprint);

const doc = createEditableUIDocumentFromBlueprint(blueprint!, { now: "2026-01-01T00:00:00.000Z" });
assert.strictEqual(validateEditableUIDocument(doc).valid, true);
const roundtrip = parseEditableUIDocument(serializeEditableUIDocument(doc));
assert.deepStrictEqual(roundtrip, doc);
const cloned = cloneEditableUIDocument(doc);
assert.deepStrictEqual(cloned, doc);
assert.notStrictEqual(cloned, doc);
assert.notStrictEqual(cloned.pages[0], doc.pages[0]);
const flattened = flattenEditableNodes(doc);
assert.ok(flattened.length > 0);
const first = flattened[0];
assert.ok(findNodeById(doc, first.id));
const doc2 = createEditableUIDocumentFromBlueprint(blueprint!, { now: "2026-01-01T00:00:00.000Z" });
assert.deepStrictEqual(doc2, doc);

const moved = cloneEditableUIDocument(doc);
moved.pages[0].rootNodeIds = [...moved.pages[0].rootNodeIds].reverse();
assertNodeIdentityStableBeforeAfter(doc.pages[0].nodes[first.id], moved.pages[0].nodes[first.id]);

const invalidIdentity = cloneEditableUIDocument(doc);
delete (invalidIdentity.pages[0].nodes[first.id] as any).identity;
assert.strictEqual(validateEditableUIDocument(invalidIdentity).valid, false);

const missingPages = { ...cloneEditableUIDocument(doc), pages: undefined as any };
assert.strictEqual(validateEditableUIDocument(missingPages).valid, false);

const missingNodes = cloneEditableUIDocument(doc);
delete (missingNodes.pages[0] as any).nodes;
assert.strictEqual(validateEditableUIDocument(missingNodes).valid, false);

const missingRoot = cloneEditableUIDocument(doc);
const rootId = missingRoot.pages[0].rootNodeIds[0];
delete missingRoot.pages[0].nodes[rootId];
assert.strictEqual(validateEditableUIDocument(missingRoot).valid, false);

const danglingChild = cloneEditableUIDocument(doc);
danglingChild.pages[0].nodes[danglingChild.pages[0].rootNodeIds[0]].childIds.push("missing-child");
assert.strictEqual(validateEditableUIDocument(danglingChild).valid, false);

const danglingParent = cloneEditableUIDocument(doc);
const someNodeId = Object.keys(danglingParent.pages[0].nodes).find((id) => id !== danglingParent.pages[0].rootNodeIds[0])!;
danglingParent.pages[0].nodes[someNodeId].parentId = "missing-parent";
assert.strictEqual(validateEditableUIDocument(danglingParent).valid, false);

const identityMismatch = cloneEditableUIDocument(doc);
identityMismatch.pages[0].nodes[someNodeId].identity.nodeId = "other-id";
assert.strictEqual(validateEditableUIDocument(identityMismatch).valid, false);

const staleBlueprint: UIBlueprint = {
  ...blueprint!,
  pages: [{ ...blueprint!.pages[0], components: [...blueprint!.pages[0].components, "missing-component-id"] }],
};
const staleDoc = createEditableUIDocumentFromBlueprint(staleBlueprint, { now: "2026-01-01T00:00:00.000Z" });
assert.strictEqual(validateEditableUIDocument(staleDoc).valid, true);
for (const childId of staleDoc.pages[0].nodes[staleDoc.pages[0].rootNodeIds[0]].childIds) {
  assert.ok(staleDoc.pages[0].nodes[childId]);
}
assert.throws(() => parseEditableUIDocument('{"id":"x","version":"1","pages":{}}'), /document.pages must be an array/);

assert.strictEqual(JSON.stringify(blueprint), inputSnapshot);
assert.ok(doc.metadata.claimBoundary.includes("does not implement command parsing"));
assert.ok(EDITABLE_UI_DOCUMENT_CAVEAT.includes("live preview mutation"));

console.log("ui-preview-engine uiDocumentModel.test.ts passed");
