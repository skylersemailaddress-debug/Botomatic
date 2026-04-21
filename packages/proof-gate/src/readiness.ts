export type ReadinessLevel = "not_ready" | "mvp_ready" | "release_candidate";

export interface ReadinessReport {
  projectId: string;
  level: ReadinessLevel;
  packetsTotal: number;
  packetsComplete: number;
  validationsPassed: number;
  validationsTotal: number;
  summary: string;
}

export function computeReadiness(input: {
  projectId: string;
  packets: { status: string }[];
  validations?: Record<string, { status: string }>;
}): ReadinessReport {
  const packetsTotal = input.packets.length;
  const packetsComplete = input.packets.filter((p) => p.status === "complete").length;

  const validations = Object.values(input.validations || {});
  const validationsTotal = validations.length;
  const validationsPassed = validations.filter((v) => v.status === "passed").length;

  const level: ReadinessLevel =
    packetsTotal > 0 && packetsComplete === packetsTotal && validationsPassed === validationsTotal
      ? "mvp_ready"
      : "not_ready";

  return {
    projectId: input.projectId,
    level,
    packetsTotal,
    packetsComplete,
    validationsPassed,
    validationsTotal,
    summary:
      level === "mvp_ready"
        ? "All packets complete and all validations passed."
        : "Project is still in progress or has unresolved validation work."
  };
}
