import { Mission, MissionClaimLevel } from "./missionModel.js";

const CLAIM_RANK: Record<MissionClaimLevel, number> = {
  MISSION_COMPILED: 0,
  WAVE_READY: 1,
  WAVE_PROVEN: 2,
  SYSTEM_PARTIAL: 3,
  SYSTEM_BUILDABLE: 4,
  SYSTEM_RUNTIME_PROVEN: 5,
  SYSTEM_LAUNCH_READY: 6,
};

// Waves required before each claim level is supported
const REQUIRED_WAVES: Record<MissionClaimLevel, string[]> = {
  MISSION_COMPILED: [],
  WAVE_READY: [],
  WAVE_PROVEN: [],
  SYSTEM_PARTIAL: ["repo_layout"],
  SYSTEM_BUILDABLE: ["repo_layout", "api_schema", "spec_compiler", "execution_runtime", "builder_factory"],
  SYSTEM_RUNTIME_PROVEN: [
    "repo_layout", "api_schema", "spec_compiler", "execution_runtime",
    "builder_factory", "repair_replay", "validation_proof",
  ],
  SYSTEM_LAUNCH_READY: [
    "repo_layout", "api_schema", "spec_compiler", "execution_runtime",
    "builder_factory", "repair_replay", "truth_memory", "intelligence_shell",
    "governance_security", "deployment_rollback", "validation_proof", "fresh_clone_proof",
  ],
};

export function evaluateMissionClaim(mission: Mission): MissionClaimLevel {
  const provenIds = new Set(
    mission.waves.filter((w) => w.status === "proven").map((w) => w.waveId)
  );
  const hasAnyProven = provenIds.size > 0;
  // "ready" means explicitly marked ready by the planner — pending alone is not ready
  const hasAnyReady = mission.waves.some((w) => w.status === "ready");

  // Walk down from highest to lowest, return first supported level
  const levels: MissionClaimLevel[] = [
    "SYSTEM_LAUNCH_READY",
    "SYSTEM_RUNTIME_PROVEN",
    "SYSTEM_BUILDABLE",
    "SYSTEM_PARTIAL",
    "WAVE_PROVEN",
    "WAVE_READY",
    "MISSION_COMPILED",
  ];

  for (const level of levels) {
    const required = REQUIRED_WAVES[level];
    if (required.length === 0) {
      // Special handling for basic levels
      if (level === "WAVE_PROVEN" && !hasAnyProven) continue;
      if (level === "WAVE_READY" && !hasAnyReady && !hasAnyProven) continue;
      return level;
    }
    if (required.every((wId) => provenIds.has(wId))) return level;
  }

  return "MISSION_COMPILED";
}

export interface ClaimBoundaryResult {
  requested: MissionClaimLevel;
  supported: MissionClaimLevel;
  allowed: boolean;
  reason: string;
  missingWaves: string[];
  provenWaves: string[];
}

export function checkClaimBoundary(
  mission: Mission,
  requestedLevel: MissionClaimLevel
): ClaimBoundaryResult {
  const supported = evaluateMissionClaim(mission);
  const allowed = CLAIM_RANK[supported] >= CLAIM_RANK[requestedLevel];

  const provenIds = new Set(
    mission.waves.filter((w) => w.status === "proven").map((w) => w.waveId)
  );
  const required = REQUIRED_WAVES[requestedLevel];
  const missingWaves = required.filter((id) => !provenIds.has(id));
  const provenWaves = required.filter((id) => provenIds.has(id));

  const reason = allowed
    ? `Claim "${requestedLevel}" supported — all required waves proven.`
    : `Claim "${requestedLevel}" blocked — missing proven waves: ${missingWaves.join(", ")}. Supported level: "${supported}".`;

  return { requested: requestedLevel, supported, allowed, reason, missingWaves, provenWaves };
}

export function getUnprovenRequiredWaves(
  mission: Mission,
  targetLevel: MissionClaimLevel
): string[] {
  const provenIds = new Set(
    mission.waves.filter((w) => w.status === "proven").map((w) => w.waveId)
  );
  return REQUIRED_WAVES[targetLevel].filter((id) => !provenIds.has(id));
}

export function formatClaimBoundaryReport(mission: Mission): string {
  const lines: string[] = [
    `Mission: ${mission.missionId}`,
    `Status: ${mission.status}`,
    `Proven waves: ${mission.provenWaves}/${mission.totalWaves}`,
    `Current claim level: ${mission.claimLevel}`,
    "",
    "Claim Boundary Table:",
  ];

  const levels: MissionClaimLevel[] = [
    "MISSION_COMPILED", "WAVE_READY", "WAVE_PROVEN",
    "SYSTEM_PARTIAL", "SYSTEM_BUILDABLE", "SYSTEM_RUNTIME_PROVEN", "SYSTEM_LAUNCH_READY",
  ];

  for (const level of levels) {
    const result = checkClaimBoundary(mission, level);
    const icon = result.allowed ? "✅" : "🔒";
    const missing = result.missingWaves.length > 0 ? ` (missing: ${result.missingWaves.join(", ")})` : "";
    lines.push(`  ${icon} ${level}${missing}`);
  }

  return lines.join("\n");
}
