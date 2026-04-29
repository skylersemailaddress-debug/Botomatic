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
