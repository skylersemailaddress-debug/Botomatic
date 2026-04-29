import assert from "assert";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { LiveUIBuilderInspectOverlay } from "../../../../apps/control-plane/src/components/live-ui-builder/LiveUIBuilderInspectOverlay";

const html = renderToStaticMarkup(React.createElement(LiveUIBuilderInspectOverlay, { selectedNodeId: "node-a", changedNodeIds: ["node-b"], onSelectNode: () => undefined }));
assert(html.includes("data-selected=\"true\""));
assert(html.includes("data-live-ui-node-id=\"node-b\""));
assert(html.includes("data-changed=\"true\""));
assert(html.includes("data-selectable=\"true\""));
console.log("liveUIBuilderInspectOverlay.test.ts passed");
