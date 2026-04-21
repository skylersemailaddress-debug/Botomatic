import { MasterTruth } from "../../core-contracts/src/masterTruth";
import { Packet } from "../../core-contracts/src/packet";

export type Milestone = {
  id: string;
  title: string;
  sequence: number;
};

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

export function generatePlan(truth: MasterTruth): {
  milestones: Milestone[];
  packets: Packet[];
} {
  const milestones = createMilestones(truth.projectId);

  const packets: Packet[] = [];

  milestones.forEach((m, i) => {
    packets.push(createPacket(truth.projectId, m, m.title, i + 1));
  });

  return { milestones, packets };
}
