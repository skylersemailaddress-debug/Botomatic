import { MasterTruth } from "../../core-contracts/src/masterTruth";
import { Packet } from "../../core-contracts/src/packet";

export type Milestone = {
  id: string;
  title: string;
  sequence: number;
};

function requestRequiresPayments(truth: MasterTruth): boolean {
  const text = `${truth.coreValue} ${truth.category} ${(truth.features || []).join(" ")}`.toLowerCase();
  return /(payment|billing|checkout|subscription|invoice|refund|tax|payout|dispute)/i.test(text);
}

function requestRequiresNotifications(truth: MasterTruth): boolean {
  const text = `${truth.coreValue} ${truth.category} ${(truth.features || []).join(" ")}`.toLowerCase();
  return /(notification|notify|alert|email|sms|reminder|message|ticket)/i.test(text);
}

function createMilestones(projectId: string): Milestone[] {
  return [
    { id: `${projectId}-m1`, title: "Scaffold + Repo Setup", sequence: 1 },
    { id: `${projectId}-m2`, title: "Auth + App Shell", sequence: 2 },
    { id: `${projectId}-m3`, title: "Core Data Model", sequence: 3 },
    { id: `${projectId}-m4`, title: "Core Workflow Pages", sequence: 4 },
    { id: `${projectId}-m5`, title: "Validation + Preview", sequence: 5 }
  ];
}

function createPacket(projectId: string, milestone: Milestone, goal: string, idx: number): Packet {
  const now = new Date().toISOString();
  return {
    packetId: `${milestone.id}-p${idx}`,
    projectId,
    milestoneId: milestone.id,
    goal,
    branchName: `build/${projectId}/${milestone.sequence}-${idx}`,
    filesToTouch: [],
    requirements: [goal],
    acceptanceCriteria: ["Build completes", "CI passes"],
    validationCommands: ["npm run build"],
    constraints: ["Do not exceed packet scope"],
    executorTarget: "claude",
    dependencies: [],
    retryCount: 0,
    maxRetries: 2,
    riskLevel: "low",
    status: "pending",
    createdAt: now,
    updatedAt: now
  };
}

function appendUniquePacket(packets: Packet[], packet: Packet): void {
  const goal = packet.goal.trim().toLowerCase();
  const exists = packets.some((p) => p.goal.trim().toLowerCase() === goal);
  if (!exists) packets.push(packet);
}

export function generatePlan(truth: MasterTruth): {
  milestones: Milestone[];
  packets: Packet[];
} {
  const milestones = createMilestones(truth.projectId);

  const canonicalPages = Array.isArray((truth as any)?.canonicalSpec?.pages)
    ? ((truth as any).canonicalSpec.pages as string[])
    : [];
  const canonicalWorkflows = Array.isArray((truth as any)?.canonicalSpec?.workflows)
    ? ((truth as any).canonicalSpec.workflows as string[])
    : [];
  const canonicalDataModel = Array.isArray((truth as any)?.canonicalSpec?.dataModel)
    ? ((truth as any).canonicalSpec.dataModel as string[])
    : [];

  const packets: Packet[] = [];

  milestones.forEach((m, i) => {
    packets.push(createPacket(truth.projectId, m, m.title, i + 1));
  });

  const foundationGoals: Array<{ milestoneIndex: number; goal: string }> = [
    { milestoneIndex: 0, goal: "Define product truth and build contract" },
    { milestoneIndex: 0, goal: "Set architecture baseline and workspace setup" },
    { milestoneIndex: 1, goal: "Implement authentication and RBAC enforcement" },
    { milestoneIndex: 2, goal: "Design database schema and entity relationships" },
    { milestoneIndex: 2, goal: "Create and validate database migrations" },
    { milestoneIndex: 3, goal: "Implement API routes for core workflows" },
    { milestoneIndex: 3, goal: "Implement frontend pages and navigation" },
    { milestoneIndex: 3, goal: "Implement forms with validation and handlers" },
    { milestoneIndex: 3, goal: "Implement workflow orchestration logic" },
    { milestoneIndex: 3, goal: "Implement admin tools and governance controls" },
    { milestoneIndex: 3, goal: "Implement required third-party integrations" },
    { milestoneIndex: 3, goal: "Implement loading, empty, and error UI states" },
    { milestoneIndex: 3, goal: "Implement responsive UI requirements" },
    { milestoneIndex: 4, goal: "Implement security hardening and auditability" },
    { milestoneIndex: 4, goal: "Add automated tests for critical workflows" },
    { milestoneIndex: 4, goal: "Create deployment configuration and environment manifest" },
    { milestoneIndex: 4, goal: "Write README and operations runbook" },
    { milestoneIndex: 4, goal: "Produce launch packet and readiness summary" },
    { milestoneIndex: 4, goal: "Capture final validation proof artifact" },
  ];

  if (requestRequiresPayments(truth)) {
    foundationGoals.push({ milestoneIndex: 3, goal: "Implement payments flow and billing controls" });
  }

  if (requestRequiresNotifications(truth)) {
    foundationGoals.push({ milestoneIndex: 3, goal: "Implement notifications and delivery workflow" });
  }

  foundationGoals.forEach((item, idx) => {
    const milestone = milestones[item.milestoneIndex] || milestones[0];
    appendUniquePacket(packets, createPacket(truth.projectId, milestone, item.goal, 100 + idx));
  });

  // Add deterministic packets from enriched spec so planner reflects real product scope.
  canonicalPages.slice(0, 6).forEach((page, idx) => {
    appendUniquePacket(packets, createPacket(truth.projectId, milestones[3], `Implement page: ${page}`, idx + 10));
  });

  canonicalWorkflows.slice(0, 6).forEach((workflow, idx) => {
    appendUniquePacket(packets, createPacket(truth.projectId, milestones[4], `Implement workflow: ${workflow}`, idx + 20));
  });

  canonicalDataModel.slice(0, 6).forEach((entity, idx) => {
    appendUniquePacket(packets, createPacket(truth.projectId, milestones[2], `Implement data entity: ${entity}`, idx + 30));
  });

  return { milestones, packets };
}
