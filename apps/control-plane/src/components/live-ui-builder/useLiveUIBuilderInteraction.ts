import { useMemo, useState } from "react";
import {
  confirmUIPreviewPendingEdit,
  createUIPreviewInteractionFixture,
  createUIPreviewInteractionState,
  handleUIPreviewChatEdit,
  handleUIPreviewSelectionChange,
  rejectUIPreviewPendingEdit,
  type UIPreviewInteractionResult,
  type UIPreviewInteractionState,
} from "../../../../../packages/ui-preview-engine/src";

export type LiveUIBuilderInteractionController = {
  getState: () => UIPreviewInteractionState;
  submitTypedEdit: (text: string) => UIPreviewInteractionResult;
  submitSpokenEdit: (text: string) => UIPreviewInteractionResult;
  selectNode: (nodeId: string) => void;
  confirmPendingEdit: () => UIPreviewInteractionResult;
  rejectPendingEdit: () => UIPreviewInteractionResult;
};

export function createLiveUIBuilderInteractionController(seedState?: UIPreviewInteractionState): LiveUIBuilderInteractionController {
  const fx = createUIPreviewInteractionFixture();
  let state = seedState ?? createUIPreviewInteractionState(fx.doc);

  const apply = (result: UIPreviewInteractionResult) => {
    state = result.nextState;
    return result;
  };

  return {
    getState: () => state,
    submitTypedEdit: (text: string) => apply(handleUIPreviewChatEdit({ text, source: "typedChat", selectedNodeId: state.selection.selectedNodeId }, state)),
    submitSpokenEdit: (text: string) => apply(handleUIPreviewChatEdit({ text, source: "spokenChat", selectedNodeId: state.selection.selectedNodeId }, state)),
    selectNode: (nodeId: string) => {
      state = handleUIPreviewSelectionChange({ source: "typedChat", selectedNodeId: nodeId }, state);
    },
    confirmPendingEdit: () => apply(confirmUIPreviewPendingEdit(state)),
    rejectPendingEdit: () => apply(rejectUIPreviewPendingEdit(state)),
  };
}

export function useLiveUIBuilderInteraction() {
  const controller = useMemo(() => createLiveUIBuilderInteractionController(), []);
  const [state, setState] = useState<UIPreviewInteractionState>(controller.getState());

  return {
    state,
    submitTypedEdit: (text: string) => setState(controller.submitTypedEdit(text).nextState),
    submitSpokenEdit: (text: string) => setState(controller.submitSpokenEdit(text).nextState),
    selectNode: (nodeId: string) => setState((prev) => {
      controller.selectNode(nodeId);
      return controller.getState() ?? prev;
    }),
    confirmPendingEdit: () => setState(controller.confirmPendingEdit().nextState),
    rejectPendingEdit: () => setState(controller.rejectPendingEdit().nextState),
  };
}
