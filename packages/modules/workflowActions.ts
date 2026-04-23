import { can, Role } from "./rbac";
import { recordEvent } from "./audit";
import { sendNotification } from "./notifications";
import { WorkflowRecord, WorkflowState, transitionWorkflow } from "./workflow";

export function applyWorkflowAction(input: {
  workflow: WorkflowRecord;
  actorId: string;
  actorRole: Role;
  nextState: WorkflowState;
  notifyRecipient?: string;
}) {
  const requiresApproval = input.nextState === "approved" || input.nextState === "rejected";

  if (requiresApproval && !can(input.actorRole, "approve")) {
    throw new Error(`Role ${input.actorRole} cannot transition workflow to ${input.nextState}`);
  }

  const updated = transitionWorkflow(input.workflow, input.nextState);

  const audit = recordEvent({
    actorId: input.actorId,
    action: `workflow_${input.nextState}`,
    resource: input.workflow.workflowId,
    metadata: {
      from: input.workflow.state,
      to: updated.state,
      actorRole: input.actorRole,
    },
  });

  const notification = input.notifyRecipient
    ? sendNotification({
        channel: "in_app",
        recipient: input.notifyRecipient,
        subject: `Workflow ${updated.state}`,
        body: `Workflow ${input.workflow.workflowId} moved from ${input.workflow.state} to ${updated.state}`,
      })
    : null;

  return {
    workflow: updated,
    audit,
    notification,
  };
}
