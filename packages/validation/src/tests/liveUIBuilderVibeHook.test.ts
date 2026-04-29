import assert from "assert";
import { createVibeInteractionHarness } from "../../../../apps/control-plane/src/components/vibe/useLiveUIBuilderVibe";

const h = createVibeInteractionHarness();

const a = h.runSampleEdit();
assert.strictEqual(a.status, "applied");
assert.ok(a.userFacingSummary.includes("Elevated Luxury Stays"));
assert.ok(h.getLatestReviewPayload());

const b = h.runDestructiveEdit();
assert.strictEqual(b.status, "needsConfirmation");
assert.strictEqual(h.getState().pendingReview?.required, true);

const c = h.confirmPending();
assert.strictEqual(c.status, "applied");
assert.strictEqual(h.getState().pendingReview, undefined);

h.runDestructiveEdit();
const d = h.rejectPending();
assert.strictEqual(d.status, "idle");
assert.strictEqual(h.getState().pendingReview, undefined);

console.log("liveUIBuilderVibeHook.test.ts passed");
