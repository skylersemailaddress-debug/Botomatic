import assert from "assert";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { LiveUIBuilderDirectManipulationOverlay } from "../../../../apps/control-plane/src/components/live-ui-builder/LiveUIBuilderDirectManipulationOverlay";

const actions: any[] = [];
const el = React.createElement(LiveUIBuilderDirectManipulationOverlay, { selectedNodeId: "node-1", pageId: "page-1", onAction: (a:any)=>actions.push(a) });
const html = renderToStaticMarkup(el);
assert(html.includes("Selected: node-1"));
assert(!html.includes("disabled"));

const noSel = renderToStaticMarkup(React.createElement(LiveUIBuilderDirectManipulationOverlay, { pageId: "p", onAction: ()=>undefined }));
assert(noSel.includes("disabled"));

const props: any = (LiveUIBuilderDirectManipulationOverlay as any)({ selectedNodeId: "n", pageId: "p", onAction: (a:any)=>actions.push(a) });
const group = props.props.children[2];
for (const btn of group.props.children) btn.props.onClick();
assert.deepStrictEqual(actions[0], { type: "duplicateNode", pageId: "p", nodeId: "n", idSeed: "live-ui" });
assert.deepStrictEqual(actions[1], { type: "deleteNode", pageId: "p", nodeId: "n", confirm: false });
assert.deepStrictEqual(actions[2], { type: "resizeNode", pageId: "p", nodeId: "n", width: "320px" });
assert.deepStrictEqual(actions[3], { type: "editProp", pageId: "p", nodeId: "n", propName: "className", value: "liveui-selected" });
console.log("liveUIBuilderDirectManipulationOverlay test passed");


import { createEditableUIDocumentFromBlueprint } from "../../../../packages/ui-preview-engine/src/uiDocumentModel";
import { getUiBlueprint } from "../../../../packages/ui-blueprint-registry/src";
import { applyUIDirectManipulation } from "../../../../packages/ui-preview-engine/src/uiDirectManipulationMutation";
const d = createEditableUIDocumentFromBlueprint(getUiBlueprint("saasDashboard")!);
const p = d.pages[0]; const r = p.rootNodeIds[0]; const n = p.nodes[r].childIds[0];
const pending = applyUIDirectManipulation(d, { type: "deleteNode", pageId: p.id, nodeId: n });
assert.strictEqual(pending.status, "needsConfirmation");
