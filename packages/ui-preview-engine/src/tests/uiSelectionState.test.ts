import assert from "assert";
import { clearUISelection, createUISelectionState, validateUISelectionState } from "../uiSelectionState";

const a = createUISelectionState({ source: "spokenChat", selectedNodeId: "n1" });
assert.ok(validateUISelectionState(a).valid);
assert.strictEqual(a.source, "spokenChat");
assert.ok(a.caveat.includes("data-only"));
assert.ok(validateUISelectionState(createUISelectionState({ source: "click" })).valid);
assert.ok(validateUISelectionState(createUISelectionState({ source: "testFixture" })).valid);
const cleared = clearUISelection(a, "2026-01-01T00:00:00.000Z");
assert.strictEqual(cleared.selectedNodeId, undefined);
assert.strictEqual(cleared.updatedAt, "2026-01-01T00:00:00.000Z");
console.log("uiSelectionState tests passed");
