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
console.log("liveUIBuilderVibeHook.test.ts passed");
