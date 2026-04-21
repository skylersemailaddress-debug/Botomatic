import { canAutoProceed } from "../../autonomy-policy/src/policy";
import { canTransition, ProjectState } from "../../state-machine/src/projectState";

export type PacketLike = {
  packetId: string;
  status: string;
  retryCount: number;
  maxRetries: number;
  riskLevel: "low" | "medium" | "high";
};

export type RunnerProject = {
  projectId: string;
  status: ProjectState;
  packets: PacketLike[];
};

export function selectNextPacket(project: RunnerProject): PacketLike | null {
  return project.packets.find((packet) => packet.status === "pending" || packet.status === "queued") ?? null;
}

export function advanceProject(project: RunnerProject): RunnerProject {
  const nextPacket = selectNextPacket(project);
  if (!nextPacket) {
    if (canTransition(project.status, "preview_ready")) {
      return { ...project, status: "preview_ready" };
    }
    return project;
  }

  const decision = canAutoProceed(nextPacket as any);
  if (!decision.allowed) {
    if (canTransition(project.status, "blocked")) {
      return { ...project, status: "blocked" };
    }
    return project;
  }

  const updatedPackets = project.packets.map((packet) =>
    packet.packetId === nextPacket.packetId
      ? { ...packet, status: "executing" }
      : packet
  );

  const nextStatus = canTransition(project.status, "executing") ? "executing" : project.status;

  return {
    ...project,
    status: nextStatus,
    packets: updatedPackets
  };
}

export function markPacketComplete(project: RunnerProject, packetId: string): RunnerProject {
  const updatedPackets = project.packets.map((packet) =>
    packet.packetId === packetId ? { ...packet, status: "complete" } : packet
  );

  const hasRemaining = updatedPackets.some((packet) => packet.status !== "complete");
  const nextStatus = hasRemaining ? "queued" : "preview_ready";

  return {
    ...project,
    status: nextStatus,
    packets: updatedPackets
  };
}
