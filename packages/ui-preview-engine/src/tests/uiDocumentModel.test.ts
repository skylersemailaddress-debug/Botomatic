import assert from "assert";
import { getUiBlueprint } from "../../../ui-blueprint-registry/src";
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

const invalid = cloneEditableUIDocument(doc);
delete (invalid.pages[0].nodes[first.id] as any).identity;
assert.strictEqual(validateEditableUIDocument(invalid).valid, false);

assert.strictEqual(JSON.stringify(blueprint), inputSnapshot);
assert.ok(doc.metadata.claimBoundary.includes("does not implement command parsing"));
assert.ok(EDITABLE_UI_DOCUMENT_CAVEAT.includes("live preview mutation"));

console.log("ui-preview-engine uiDocumentModel.test.ts passed");
