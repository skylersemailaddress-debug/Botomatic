import { getUiBlueprint } from "../../ui-blueprint-registry/src";
import { createEditableUIDocumentFromBlueprint } from "./uiDocumentModel";
import { createUIPreviewInteractionState } from "./uiPreviewInteractionState";
import { handleUIPreviewChatEdit } from "./uiPreviewInteractionAdapter";

export function createUIPreviewInteractionFixture(now = "2026-01-01T00:00:00.000Z") {
  const doc = createEditableUIDocumentFromBlueprint(getUiBlueprint("saasDashboard")!, { now });
  const node = doc.pages[0].nodes[doc.pages[0].rootNodeIds[0]].childIds[0];
  return { doc, node, now };
}

export function createSampleUIPreviewInteractionState() {
  const fx = createUIPreviewInteractionFixture();
  return createUIPreviewInteractionState(fx.doc);
}

export function runSampleUIPreviewEditSequence() {
  const fx = createUIPreviewInteractionFixture();
  let state = createUIPreviewInteractionState(fx.doc);
  const applied = handleUIPreviewChatEdit({ text: 'rewrite this headline to "Updated"', source: "typedChat", selectedNodeId: fx.node, now: fx.now }, state);
  state = applied.nextState;
  const needsConfirmation = handleUIPreviewChatEdit({ text: "remove this", source: "spokenChat", selectedNodeId: fx.node, now: fx.now }, state);
  return { applied, needsConfirmation };
}
