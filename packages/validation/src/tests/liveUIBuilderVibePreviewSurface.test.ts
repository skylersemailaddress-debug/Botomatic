import assert from "assert";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createUIPreviewInteractionFixture } from "../../../../packages/ui-preview-engine/src/uiPreviewInteractionFixture";
import { LiveUIBuilderPreviewSurface } from "../../../../apps/control-plane/src/components/vibe/LiveUIBuilderPreviewSurface";

const fx = createUIPreviewInteractionFixture();
const html = renderToStaticMarkup(React.createElement(LiveUIBuilderPreviewSurface, { editableDocument: fx.doc, selectedNodeId: fx.node, changedNodeIds: [fx.node], previewPatch: { ok: true }, onSelectNode: () => undefined }));
assert(html.includes("Document-driven preview, not final production rendering."));
assert(html.includes("data-preview-status=\"document-driven\""));
assert(html.includes("data-live-ui-node-id"));
assert(html.includes("data-selected=\"true\""));
assert(html.includes("data-changed=\"true\""));
console.log("liveUIBuilderVibePreviewSurface.test.ts passed");
