import assert from "assert";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createUIPreviewInteractionFixture } from "../../../../packages/ui-preview-engine/src/uiPreviewInteractionFixture";
import { LiveUIBuilderDocumentRenderer } from "../../../../apps/control-plane/src/components/live-ui-builder/LiveUIBuilderDocumentRenderer";

const fx = createUIPreviewInteractionFixture();
const html = renderToStaticMarkup(React.createElement(LiveUIBuilderDocumentRenderer, { editableDocument: fx.doc }));
assert(html.includes("Document-driven preview, not final production rendering."));
assert(!html.includes("LUXORA"));
assert(html.includes("data-live-ui-node-id"));
assert(html.includes("Unknown node kind rendered safely.") === false);
console.log("liveUIBuilderDocumentRenderer.test.ts passed");
