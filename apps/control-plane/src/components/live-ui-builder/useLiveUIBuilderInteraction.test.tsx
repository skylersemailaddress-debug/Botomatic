import { createUIPreviewInteractionFixture } from "../../../../../packages/ui-preview-engine/src";
import assert from "node:assert/strict";
import { createLiveUIBuilderInteractionController } from "./useLiveUIBuilderInteraction";

const c = createLiveUIBuilderInteractionController();
const fx = createUIPreviewInteractionFixture();
c.selectNode(fx.node);
const initialDoc = JSON.stringify(c.getState().editableDocument);

const typed = c.submitTypedEdit('rewrite this headline to "Updated"');
assert.equal(typed.status, "applied");
assert.notEqual(JSON.stringify(c.getState().editableDocument), initialDoc);

const spoken = c.submitSpokenEdit('rewrite this headline to "Again"');
assert.equal(spoken.command?.source, "spokenChat");

const destructive = c.submitTypedEdit("remove this");
assert.equal(destructive.status, "needsConfirmation");
assert.ok(c.getState().pendingReview);

const beforeConfirm = JSON.stringify(c.getState().editableDocument);
const confirmed = c.confirmPendingEdit();
assert.equal(confirmed.status, "applied");
assert.equal(Boolean(c.getState().pendingReview), false);
assert.notEqual(JSON.stringify(c.getState().editableDocument), beforeConfirm);

const destructive2 = c.submitTypedEdit("remove this");
assert.equal(destructive2.status, "needsConfirmation");
const beforeReject = JSON.stringify(c.getState().editableDocument);
const rejected = c.rejectPendingEdit();
assert.equal(rejected.status, "idle");
assert.equal(Boolean(c.getState().pendingReview), false);
assert.equal(JSON.stringify(c.getState().editableDocument), beforeReject);

const sourceSummary = c.getState().sourceSyncPlan?.caveat ?? "planning-only";
assert.ok(sourceSummary.toLowerCase().includes("planning-only") || sourceSummary.toLowerCase().includes("planning only"));

const hookSource = require("node:fs").readFileSync("apps/control-plane/src/components/live-ui-builder/useLiveUIBuilderInteraction.ts", "utf8");
assert.ok(!hookSource.includes("deploy"));
assert.ok(!hookSource.includes("writeFile"));

console.log("useLiveUIBuilderInteraction tests passed");
