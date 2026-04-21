import { canAutoProceed } from "../../autonomy-policy/src/policy";
import { canTransition, ProjectState } from "../../state-machine/src/projectState";
import { createRunRecord, appendLog, PacketRunRecord } from "./logs";

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
  runs?: Record<string, PacketRunRecord>;
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

  const runs = project.runs ?? {};
  let run = runs[nextPacket.packetId] ?? createRunRecord(project.projectId, nextPacket.packetId);

  run = appendLog(run, { level: "info", event: "packet_started" });
  run.status = "executing";

  const updatedPackets = project.packets.map((packet) =>
    packet.packetId === nextPacket.packetId
      ? { ...packet, status: "executing" }
      : packet
  );

  return {
    ...project,
    status: canTransition(project.status, "executing") ? "executing" : project.status,
    packets: updatedPackets,
    runs: {
      ...runs,
      [nextPacket.packetId]: run
    }
  };
}

export function markPacketComplete(project: RunnerProject, packetId: string): RunnerProject {
  const runs = project.runs ?? {};
  let run = runs[packetId];

  if (run) {
    run = appendLog(run, { level: "info", event: "packet_completed" });
    run.status = "complete";
  }

  const updatedPackets = project.packets.map((packet) =>
    packet.packetId === packetId ? { ...packet, status: "complete" } : packet
  );

  const hasRemaining = updatedPackets.some((packet) => packet.status !== "complete");

  return {
    ...project,
    status: hasRemaining ? "queued" : "preview_ready",
    packets: updatedPackets,
    runs: {
      ...runs,
      [packetId]: run
    }
  };
}

export function markPacketFailed(project: RunnerProject, packetId: string): RunnerProject {
  const runs = project.runs ?? {};
  let run = runs[packetId];

  if (run) {
    run = appendLog(run, { level: "error", event: "packet_failed" });
    run.retryCount += 1;
    run.status = "failed";
  }

  const updatedPackets = project.packets.map((packet) =>
    packet.packetId === packetId
      ? {
          ...packet,
          status: run && run.retryCount < packet.maxRetries ? "queued" : "blocked",
          retryCount: run?.retryCount ?? packet.retryCount
        }
      : packet
  );

  return {
    ...project,
    status: "repairing",
    packets: updatedPackets,
    runs: {
      ...runs,
      [packetId]: run
    }
  };
}
