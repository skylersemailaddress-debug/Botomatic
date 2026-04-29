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

const second = handleUIPreviewChatEdit({ text: 'rewrite this headline to "B"', source: "typedChat", selectedNodeId: fx.node, now: fx.now, idSeed: "b" }, typed.nextState);
assert.strictEqual(second.status, "applied");
assert.notDeepStrictEqual(second.nextState.editableDocument, typed.nextState.editableDocument);
assert.strictEqual(second.nextState.history.entries.length, 2);

const destructive = handleUIPreviewChatEdit({ text: "remove this", source: "typedChat", selectedNodeId: fx.node, now: fx.now, idSeed: "c" }, second.nextState);
assert.strictEqual(destructive.status, "needsConfirmation");
assert.ok(destructive.nextState.pendingReview);
assert.strictEqual(destructive.nextState.pendingReview?.selectedNodeId, fx.node);

const confirmed = confirmUIPreviewPendingEdit(destructive.nextState, { now: fx.now, idSeed: "d", confirmationMarker: true });
assert.notStrictEqual(confirmed.status, "needsResolution");
assert.strictEqual(confirmed.nextState.pendingReview, undefined);

const rejectBefore = JSON.stringify(destructive.nextState.editableDocument);
const rejected = rejectUIPreviewPendingEdit(destructive.nextState);
assert.strictEqual(rejected.status, "idle");
assert.strictEqual(rejected.nextState.pendingReview, undefined);
assert.strictEqual(JSON.stringify(rejected.nextState.editableDocument), rejectBefore);

const deterministicA1 = handleUIPreviewChatEdit({ text: 'rewrite this headline to "A"', source: "typedChat", selectedNodeId: fx.node, now: fx.now, idSeed: "det1" }, initial);
const deterministicA2 = handleUIPreviewChatEdit({ text: 'rewrite this headline to "B"', source: "typedChat", selectedNodeId: fx.node, now: fx.now, idSeed: "det2" }, deterministicA1.nextState);
const deterministicB1 = handleUIPreviewChatEdit({ text: 'rewrite this headline to "A"', source: "typedChat", selectedNodeId: fx.node, now: fx.now, idSeed: "det1" }, initial);
const deterministicB2 = handleUIPreviewChatEdit({ text: 'rewrite this headline to "B"', source: "typedChat", selectedNodeId: fx.node, now: fx.now, idSeed: "det2" }, deterministicB1.nextState);
assert.strictEqual(JSON.stringify(deterministicA2.nextState), JSON.stringify(deterministicB2.nextState));

console.log("uiPreviewInteractionAdapter tests passed");
