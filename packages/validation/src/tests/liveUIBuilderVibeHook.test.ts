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
