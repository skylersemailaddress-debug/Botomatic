import assert from "assert";
import { createUIPreviewInteractionFixture } from "../uiPreviewInteractionFixture";
import { createUIPreviewInteractionState, updateUIPreviewSelection, validateUIPreviewInteractionState } from "../uiPreviewInteractionState";

const fx = createUIPreviewInteractionFixture();
const state = createUIPreviewInteractionState(fx.doc);
assert.ok(validateUIPreviewInteractionState(state).valid);
const updated = updateUIPreviewSelection(state, { selectedNodeId: fx.node });
assert.strictEqual(updated.selection.selectedNodeId, fx.node);
assert.deepStrictEqual(updated.editableDocument, state.editableDocument);
assert.ok(state.claimBoundary.includes("no full live-builder/source-sync/export-readiness claim"));
console.log("uiPreviewInteractionState tests passed");
