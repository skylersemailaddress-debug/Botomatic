import assert from "assert";
import { createVibeInteractionHarness } from "../../../../apps/control-plane/src/components/vibe/useLiveUIBuilderVibe";

const h = createVibeInteractionHarness();
assert(h.getState().editableDocument);
h.selectNode("node:test");
assert.strictEqual(h.getState().selection.selectedNodeId, "node:test");
const a = h.runSampleEdit();
assert.strictEqual(a.status, "applied");
assert.ok(h.getState().lastPreviewPatch);
const changed = (h.getState().lastPreviewPatch?.operations ?? []).map((op: any) => op.nodeId).filter(Boolean);
assert.ok(Array.isArray(changed));

const pages = h.getState().editableDocument.pages;
const pageA = pages[0];
const pageB = pages.find((p: any) => p.id !== pageA.id);
if (pageB) {
  const nodeOnA = Object.keys(pageA.nodes)[0];
  h.selectNode(nodeOnA);
  h.selectPage(pageA.id);
  assert.strictEqual(h.getState().selection.selectedNodeId, nodeOnA);
  h.selectPage(pageB.id);
  assert.strictEqual(h.getState().selection.selectedNodeId, undefined);
}

const destructive = h.runDestructiveEdit();
assert.strictEqual(destructive.status, "needsConfirmation");
const nodeA = destructive.nextState.pendingReview?.selectedNodeId;
assert.ok(nodeA);
h.selectNode("node:test-other");
const preConfirmDiff = h.getPreConfirmDiff();
const preConfirmTargetIds = (preConfirmDiff?.operations ?? []).map((op: any) => op.nodeId).filter(Boolean);
assert(preConfirmTargetIds.includes(nodeA));
const confirmed = h.confirmPending();
const confirmedTargetIds = (confirmed.previewPatch?.operations ?? []).map((op: any) => op.nodeId).filter(Boolean);
assert(confirmedTargetIds.includes(nodeA));
assert.strictEqual(confirmed.status, "applied");

const destructive2 = h.runDestructiveEdit();
assert.strictEqual(destructive2.status, "needsConfirmation");
const rejected = h.rejectPending();
assert.strictEqual(rejected.status, "idle");

console.log("liveUIBuilderVibeHook.test.ts passed");

const hookSource = require("fs").readFileSync("apps/control-plane/src/components/vibe/useLiveUIBuilderVibe.ts", "utf8");
assert(!hookSource.includes("if (result.status === \"applied\") sourceSyncDryRun"), "source sync should remain explicit-only");
