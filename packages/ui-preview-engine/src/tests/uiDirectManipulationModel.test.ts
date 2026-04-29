import assert from "assert";
import { validateUIDirectManipulationAction } from "../uiDirectManipulationModel";

assert.strictEqual(validateUIDirectManipulationAction({ type: "selectNode", pageId: "p", nodeId: "n" }).valid, true);
assert.strictEqual(validateUIDirectManipulationAction({ type: "deleteNode", pageId: "p", nodeId: "n" }).valid, false);
assert.strictEqual(validateUIDirectManipulationAction({ type: "deleteNode", pageId: "p", nodeId: "n", confirm: true }).valid, true);
assert.strictEqual(validateUIDirectManipulationAction({ type: "editProp", pageId: "p", nodeId: "n", propName: "text", value: "x" }).valid, true);
assert.strictEqual(validateUIDirectManipulationAction({ type: "editProp", pageId: "p", nodeId: "n", propName: "bad" as any, value: "x" }).valid, false);
console.log("uiDirectManipulationModel tests passed");
