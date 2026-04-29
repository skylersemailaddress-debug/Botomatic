import assert from "assert";
import { getUiBlueprint } from "../../../ui-blueprint-registry/src";
import { cloneEditableUIDocument, createEditableUIDocumentFromBlueprint } from "../uiDocumentModel";
import {
  UI_EDIT_COMMAND_CAVEAT,
  classifyUIEditCommandKind,
  parseSerializedUIEditCommand,
  parseUIEditCommand,
  parseUIEditTarget,
  serializeUIEditCommand,
  validateUIEditCommand,
} from "../uiEditCommand";

const samples: Array<[string, string]> = [
  ["add", "add a pricing section"],
  ["remove", "remove this"],
  ["move", "move that card under the hero"],
  ["resize", "resize the hero image"],
  ["duplicate", "duplicate this card"],
  ["replace", "replace the hero with a gallery"],
  ["rewriteText", 'rewrite this headline to "Book faster"'],
  ["restyle", "make the background blue"],
  ["retheme", "retheme the app to luxury dark"],
  ["addPage", "add a page called Pricing"],
  ["removePage", "remove the testimonials page"],
  ["changeLayout", "change the layout to two columns"],
  ["changeResponsiveBehavior", "make the mobile version cleaner"],
  ["bindData", "bind this chart to revenue data"],
  ["bindAction", "bind the button to checkout"],
  ["connectForm", "connect this form to leads"],
];
for (const [kind, text] of samples) {
  assert.strictEqual(classifyUIEditCommandKind(text), kind);
  const parsed = parseUIEditCommand({ text, source: "typedChat", createdAt: "2026-02-01T00:00:00.000Z" });
  assert.ok(parsed.ok);
  assert.strictEqual(parsed.command!.kind, kind);
}

const typed = parseUIEditCommand({ text: "delete the hero image", source: "typedChat", createdAt: "2026-02-01T00:00:00.000Z" });
const spoken = parseUIEditCommand({ text: "delete the hero image", source: "spokenChat", createdAt: "2026-02-01T00:00:00.000Z" });
assert.ok(typed.ok && spoken.ok);
assert.strictEqual(typed.command!.kind, spoken.command!.kind);
assert.deepStrictEqual(typed.command!.target, spoken.command!.target);
assert.deepStrictEqual(typed.command!.payload, spoken.command!.payload);
assert.notStrictEqual(typed.command!.source, spoken.command!.source);

const unresolved = parseUIEditTarget("remove this");
assert.strictEqual(unresolved.reference.referenceKind, "selectedElement");
assert.strictEqual(unresolved.reference.requiresResolution, true);

const resolved = parseUIEditTarget("remove this", { selectedNodeId: "node:abc" });
assert.strictEqual(resolved.reference.referenceKind, "selectedElement");
assert.strictEqual(resolved.reference.nodeId, "node:abc");
assert.strictEqual(resolved.reference.requiresResolution, false);

const unknown = parseUIEditTarget("edit the thingamabob now");
assert.strictEqual(unknown.reference.referenceKind, "unknown");
assert.strictEqual(unknown.reference.requiresResolution, true);

for (const highImpact of ["remove", "remove the testimonials page", "replace the hero with a gallery", "bind this chart", "bind the button to checkout", "connect this form to leads", "retheme the app to luxury dark"]) {
  const parsed = parseUIEditCommand({ text: highImpact, source: "typedChat" });
  if (parsed.ok) assert.strictEqual(parsed.command!.safety.requiresConfirmation, true);
}

const validCommand = parseUIEditCommand({ text: "add a pricing section", source: "typedChat" }).command!;
assert.strictEqual(validateUIEditCommand({ ...validCommand, id: "" }).valid, false);
assert.strictEqual(validateUIEditCommand({ ...validCommand, kind: "unknown" as any }).valid, false);
assert.strictEqual(validateUIEditCommand({ ...validCommand, claimBoundary: undefined as any }).valid, false);

const blueprint = getUiBlueprint("saasDashboard")!;
const doc = createEditableUIDocumentFromBlueprint(blueprint, { now: "2026-02-01T00:00:00.000Z" });
const snapshot = JSON.stringify(doc);
parseUIEditCommand({ text: "remove this", source: "typedChat" });
assert.strictEqual(JSON.stringify(doc), snapshot);

const serialized = serializeUIEditCommand(validCommand);
const roundtrip = parseSerializedUIEditCommand(serialized);
assert.deepStrictEqual(roundtrip, JSON.parse(JSON.stringify(validCommand)));

const caveat = UI_EDIT_COMMAND_CAVEAT.toLowerCase();
assert.ok(caveat.includes("structured ui edit commands only"));
assert.ok(caveat.includes("does not mutate the ui document"));
assert.ok(caveat.includes("does not update the preview"));
assert.ok(caveat.includes("does not sync source files"));
assert.ok(caveat.includes("does not prove full live visual ui builder completion"));

const cloned = cloneEditableUIDocument(doc);
assert.deepStrictEqual(cloned, doc);

console.log("ui-preview-engine uiEditCommand.test.ts passed");
