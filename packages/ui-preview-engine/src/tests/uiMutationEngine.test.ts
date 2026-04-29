import assert from "assert";
import { getUiBlueprint } from "../../../ui-blueprint-registry/src";
import { cloneEditableUIDocument, createEditableUIDocumentFromBlueprint, validateEditableUIDocument } from "../uiDocumentModel";
import { parseUIEditCommand } from "../uiEditCommand";
import { applyUIEditCommand } from "../uiMutationEngine";

const base = createEditableUIDocumentFromBlueprint(getUiBlueprint("saasDashboard")!, { now: "2026-01-01T00:00:00.000Z" });
const firstNodeId = base.pages[0].nodes[base.pages[0].rootNodeIds[0]].childIds[0];
const first = base.pages[0].nodes[firstNodeId];
const fixedNow = "2026-01-02T00:00:00.000Z";
const run = (text: string, confirmed = true, selectedNodeId = firstNodeId, idSeed = "seed-1") => applyUIEditCommand(base, parseUIEditCommand({ text, source: "typedChat", selectedNodeId, createdAt: fixedNow }).command!, { confirmed, selection: { selectedNodeId } as any, now: fixedNow, idSeed });
assert.strictEqual(run("remove this", false).status, "blocked");
assert.strictEqual(run("remove this", true).status, "applied");
const dup = run("duplicate this", true); assert.strictEqual(dup.status, "applied"); assert.ok(dup.changedNodeIds[0] !== firstNodeId);
const moved = run("move this under hero", true); assert.strictEqual(moved.status, "applied"); assert.deepStrictEqual(base.pages[0].nodes[firstNodeId], first);
assert.strictEqual(run('rewrite this headline to "Hello"').afterDocument!.pages[0].nodes[firstNodeId].props.text, "Hello");
assert.strictEqual(run("make this background blue").status, "applied");
assert.strictEqual(run("retheme the app to dark").status, "applied");
assert.strictEqual(run("add a page called Pricing").afterDocument!.pages.some((p) => p.id === "pricing"), true);
assert.ok(["blocked","needsResolution"].includes(run("remove the testimonials page", false).status));
assert.strictEqual(run("replace this with card", false).status, "blocked");
assert.ok(["blocked","needsResolution"].includes(run("bind this chart to revenue data", false).status));
assert.strictEqual(run("remove this", true, "" as any).status, "needsResolution");
const invalid = cloneEditableUIDocument(base); (invalid as any).pages = undefined; const r = applyUIEditCommand(invalid as any, parseUIEditCommand({ text: "remove this", source: "typedChat" }).command!, { confirmed: true }); assert.strictEqual(r.status, "invalid");
const ok = run("connect this form to leads", true); assert.ok(ok.previewPatch.operations.length >= 1); assert.ok(validateEditableUIDocument(ok.afterDocument!).valid);
assert.strictEqual(base.pages[0].nodes[firstNodeId].identity.nodeId, first.identity.nodeId);
const c = ok.claimBoundary.toLowerCase(); assert.ok(c.includes("no source-file sync") && c.includes("no browser rendering integration") && c.includes("no full live builder completion claim"));
console.log("uiMutationEngine tests passed");

const d1 = run("duplicate this", true, firstNodeId, "same-seed");
const d2 = run("duplicate this", true, firstNodeId, "same-seed");
assert.deepStrictEqual(d1, d2);

const appliedA = applyUIEditCommand(base, parseUIEditCommand({ text: "duplicate this", source: "typedChat", selectedNodeId: firstNodeId, createdAt: fixedNow }).command!, { confirmed: true, selection: { selectedNodeId: firstNodeId } as any, idSeed: "seed-applied" });
const appliedB = applyUIEditCommand(base, parseUIEditCommand({ text: "duplicate this", source: "typedChat", selectedNodeId: firstNodeId, createdAt: fixedNow }).command!, { confirmed: true, selection: { selectedNodeId: firstNodeId } as any, idSeed: "seed-applied" });
assert.deepStrictEqual(appliedA, appliedB);

const blockedCmd = parseUIEditCommand({ text: "remove this", source: "typedChat", selectedNodeId: firstNodeId, createdAt: fixedNow }).command!;
const blockedA = applyUIEditCommand(base, blockedCmd, { confirmed: false, selection: { selectedNodeId: firstNodeId } as any });
const blockedB = applyUIEditCommand(base, blockedCmd, { confirmed: false, selection: { selectedNodeId: firstNodeId } as any });
assert.deepStrictEqual(blockedA, blockedB);

const unresolvedCmd = parseUIEditCommand({ text: "remove this", source: "typedChat", createdAt: fixedNow }).command!;
const needsA = applyUIEditCommand(base, unresolvedCmd, { confirmed: true, selection: { selectedNodeId: "" } as any });
const needsB = applyUIEditCommand(base, unresolvedCmd, { confirmed: true, selection: { selectedNodeId: "" } as any });
assert.deepStrictEqual(needsA, needsB);

const invalidDocA = cloneEditableUIDocument(base); (invalidDocA as any).pages = undefined;
const invalidCmd = parseUIEditCommand({ text: "remove this", source: "typedChat", createdAt: fixedNow }).command!;
const invalidA = applyUIEditCommand(invalidDocA as any, invalidCmd, { confirmed: true });
const invalidB = applyUIEditCommand(invalidDocA as any, invalidCmd, { confirmed: true });
assert.deepStrictEqual(invalidA, invalidB);
