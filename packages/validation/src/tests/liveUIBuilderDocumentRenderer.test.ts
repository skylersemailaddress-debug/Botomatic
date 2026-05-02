import assert from "assert";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createUIPreviewInteractionFixture } from "../../../../packages/ui-preview-engine/src/uiPreviewInteractionFixture";
import { LiveUIBuilderDocumentRenderer, resolveLiveUINodeIdFromTarget } from "../../../../apps/control-plane/src/components/live-ui-builder/LiveUIBuilderDocumentRenderer";

const fx = createUIPreviewInteractionFixture();
const rootNodeId = fx.doc.pages[0].rootNodeIds[0];
const childNodeId = fx.doc.pages[0].nodes[rootNodeId].childIds[0];
const html = renderToStaticMarkup(React.createElement(LiveUIBuilderDocumentRenderer, { editableDocument: fx.doc, selectedNodeId: childNodeId, changedNodeIds: [rootNodeId] }));
assert(html.includes("live-ui-builder-document-renderer"));
assert(!html.includes("Example canvas output for this prompt."));
assert(html.includes(`data-live-ui-node-id=\"${rootNodeId}\"`));
assert(html.includes(`data-live-ui-node-id=\"${childNodeId}\"`));
assert(html.includes("data-selectable=\"true\""));
assert(html.includes(`data-selected=\"true\"`));
assert(html.includes(`data-changed=\"true\"`));

const unknownDoc = JSON.parse(JSON.stringify(fx.doc));
unknownDoc.pages[0].nodes[childNodeId].kind = "mystery";
const unknownHtml = renderToStaticMarkup(React.createElement(LiveUIBuilderDocumentRenderer, { editableDocument: unknownDoc }));
assert(unknownHtml.includes("Unsupported node rendered safely."));

const selected = resolveLiveUINodeIdFromTarget({ closest: () => ({ getAttribute: (name: string) => (name === "data-live-ui-node-id" ? childNodeId : null) }) });
assert.strictEqual(selected, childNodeId);
console.log("liveUIBuilderDocumentRenderer.test.ts passed");
