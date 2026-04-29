import assert from "assert";
import { getUiBlueprint } from "../../../ui-blueprint-registry/src";
import { cloneEditableUIDocument, createEditableUIDocumentFromBlueprint } from "../uiDocumentModel";
import { parseUIEditCommand } from "../uiEditCommand";
import { applyUIEditWorkflow } from "../uiEditWorkflow";

const base = createEditableUIDocumentFromBlueprint(getUiBlueprint("saasDashboard")!, { now: "2026-01-01T00:00:00.000Z" });
const node = base.pages[0].nodes[base.pages[0].rootNodeIds[0]].childIds[0];

const appliedCmd = parseUIEditCommand({ text: 'rewrite this headline to "Z"', source: "typedChat", selectedNodeId: node, createdAt: "2026-01-01T00:00:00.000Z" }).command!;
const appliedCtx = { confirmed: true, selection: { selectedNodeId: node }, now: "2026-01-01T00:00:00.000Z", idSeed: "x" };
const appliedA = applyUIEditWorkflow(base, appliedCmd, appliedCtx);
const appliedB = applyUIEditWorkflow(base, appliedCmd, appliedCtx);
assert.deepStrictEqual(appliedA, appliedB);
assert.strictEqual(appliedA.status, "applied");
assert.ok(appliedA.sourceSyncPlan.success);
assert.strictEqual(appliedA.history.entries.length, 1);

const guardrailBlockedCmd = parseUIEditCommand({ text: "remove this", source: "typedChat", selectedNodeId: node, createdAt: "2026-01-01T00:00:00.000Z" }).command!;
const guardrailBlockedCtx = { confirmed: true, selection: { selectedNodeId: node }, now: "2026-01-01T00:00:00.000Z", idSeed: "g", confirmationMarker: false };
const guardrailBlockedA = applyUIEditWorkflow(base, guardrailBlockedCmd, guardrailBlockedCtx);
const guardrailBlockedB = applyUIEditWorkflow(base, guardrailBlockedCmd, guardrailBlockedCtx);
assert.deepStrictEqual(guardrailBlockedA, guardrailBlockedB);
assert.strictEqual(guardrailBlockedA.status, "blocked");
assert.strictEqual(guardrailBlockedA.sourceSyncPlan.success, false);
assert.strictEqual(guardrailBlockedA.history.entries.length, 0);

const needsCmd = parseUIEditCommand({ text: "rewrite this headline to \"A\"", source: "typedChat", createdAt: "2026-01-01T00:00:00.000Z" }).command!;
const needsCtx = { confirmed: true, selection: { selectedNodeId: "" }, now: "2026-01-01T00:00:00.000Z", idSeed: "n" };
const needsA = applyUIEditWorkflow(base, needsCmd, needsCtx);
const needsB = applyUIEditWorkflow(base, needsCmd, needsCtx);
assert.deepStrictEqual(needsA, needsB);
assert.strictEqual(needsA.status, "needsResolution");
assert.strictEqual(needsA.history.entries.length, 0);

const invalidDoc = cloneEditableUIDocument(base) as any; invalidDoc.pages = undefined;
const invalidA = applyUIEditWorkflow(invalidDoc, appliedCmd, appliedCtx as any);
const invalidB = applyUIEditWorkflow(invalidDoc, appliedCmd, appliedCtx as any);
assert.deepStrictEqual(invalidA, invalidB);
assert.strictEqual(invalidA.status, "invalid");
assert.strictEqual(invalidA.sourceSyncPlan.success, false);

assert.deepStrictEqual(base, cloneEditableUIDocument(base));
console.log("uiEditWorkflow tests passed");
