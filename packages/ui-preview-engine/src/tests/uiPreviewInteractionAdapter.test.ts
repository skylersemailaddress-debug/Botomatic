import assert from "assert";
import { createUIPreviewInteractionFixture } from "../uiPreviewInteractionFixture";
import { createUIPreviewInteractionState } from "../uiPreviewInteractionState";
import { confirmUIPreviewPendingEdit, handleUIPreviewChatEdit, rejectUIPreviewPendingEdit } from "../uiPreviewInteractionAdapter";

const fx = createUIPreviewInteractionFixture();
const initial = createUIPreviewInteractionState(fx.doc);

const typed = handleUIPreviewChatEdit({ text: 'rewrite this headline to "A"', source: "typedChat", selectedNodeId: fx.node, now: fx.now, idSeed: "a" }, initial);
const spoken = handleUIPreviewChatEdit({ text: 'rewrite this headline to "A"', source: "spokenChat", selectedNodeId: fx.node, now: fx.now, idSeed: "a" }, initial);
assert.strictEqual(typed.status, "applied");
assert.strictEqual(spoken.status, "applied");
assert.deepStrictEqual(typed.diff, spoken.diff);
assert.notDeepStrictEqual(typed.nextState.editableDocument, initial.editableDocument);
assert.strictEqual(typed.nextState.history.entries.length, 1);
assert.strictEqual(typed.nextState.selection.selectedNodeId, fx.node);

const second = handleUIPreviewChatEdit({ text: 'rewrite this headline to "B"', source: "typedChat", selectedNodeId: fx.node, now: fx.now, idSeed: "b" }, typed.nextState);
assert.strictEqual(second.status, "applied");
assert.notDeepStrictEqual(second.nextState.editableDocument, typed.nextState.editableDocument);
assert.strictEqual(second.nextState.history.entries.length, 2);

const destructive = handleUIPreviewChatEdit({ text: "remove this", source: "typedChat", selectedNodeId: fx.node, now: fx.now, idSeed: "c" }, second.nextState);
assert.strictEqual(destructive.status, "needsConfirmation");
assert.ok(destructive.nextState.pendingReview);

const confirmed = confirmUIPreviewPendingEdit(destructive.nextState, { now: fx.now, idSeed: "d", confirmationMarker: true });
assert.ok(["applied", "blocked"].includes(confirmed.status));
assert.strictEqual(confirmed.nextState.pendingReview, undefined);
if (confirmed.status === "applied") {
  assert.notDeepStrictEqual(confirmed.nextState.editableDocument, second.nextState.editableDocument);
  assert.ok(confirmed.nextState.history.entries.length >= 3);
}

const rejectState = { ...destructive.nextState };
const beforeRejectDoc = JSON.stringify(rejectState.editableDocument);
const rejected = rejectUIPreviewPendingEdit(rejectState);
assert.strictEqual(rejected.status, "idle");
assert.strictEqual(rejected.nextState.pendingReview, undefined);
assert.strictEqual(JSON.stringify(rejected.nextState.editableDocument), beforeRejectDoc);

const deterministicA = handleUIPreviewChatEdit({ text: 'rewrite this headline to "A"', source: "typedChat", selectedNodeId: fx.node, now: fx.now, idSeed: "det" }, initial);
const deterministicB = handleUIPreviewChatEdit({ text: 'rewrite this headline to "A"', source: "typedChat", selectedNodeId: fx.node, now: fx.now, idSeed: "det" }, initial);
assert.strictEqual(JSON.stringify(deterministicA.nextState), JSON.stringify(deterministicB.nextState));

console.log("uiPreviewInteractionAdapter tests passed");
