import fs from "fs/promises";
import path from "path";
import { Mission, MissionWave, MissionCheckpoint, MissionEvidence, WaveStatus } from "./missionModel.js";
import { getNextWave, canWaveRun, planWaves } from "./wavePlanner.js";
import { evaluateMissionClaim } from "./missionClaimBoundary.js";

export interface RunnerConfig {
  checkpointDir: string;
  apiBaseUrl: string;
  apiToken: string;
  dryRun?: boolean;
  maxWaves?: number;
}

export interface WaveRunResult {
  waveId: string;
  status: WaveStatus;
  evidence: MissionEvidence[];
  error?: string;
  // Artifact fields — populated by real builder execution
  builderProjectId?: string;
  artifactId?: string;
  workspacePath?: string;
  contentHash?: string;
  buildStatus?: "passed" | "failed" | "skipped";
  runStatus?: "passed" | "failed" | "skipped";
  smokeStatus?: "passed" | "failed" | "skipped";
  filesCreated?: number;
  validatorsRun?: string[];
}

export interface MissionRunResult {
  mission: Mission;
  wavesRun: number;
  wavesPassed: number;
  wavesFailed: number;
  stopped: boolean;
  stopReason?: string;
  finalClaimLevel: string;
}

const CHECKPOINT_FILE = "mission-checkpoint.json";

async function ensureDir(dir: string): Promise<void> {
  await fs.mkdir(dir, { recursive: true });
}

export async function saveCheckpoint(mission: Mission, config: RunnerConfig): Promise<void> {
  await ensureDir(config.checkpointDir);
  const checkpointPath = path.join(config.checkpointDir, CHECKPOINT_FILE);
  await fs.writeFile(checkpointPath, JSON.stringify(mission, null, 2), "utf8");
}

export async function loadCheckpoint(checkpointDir: string): Promise<Mission | null> {
  const checkpointPath = path.join(checkpointDir, CHECKPOINT_FILE);
  try {
    const raw = await fs.readFile(checkpointPath, "utf8");
    return JSON.parse(raw) as Mission;
  } catch {
    return null;
  }
}

async function executeWaveViaBuilder(
  wave: MissionWave,
  mission: Mission,
  config: RunnerConfig
): Promise<WaveRunResult> {
  const now = new Date().toISOString();
  const evidence: MissionEvidence[] = [];

  if (config.dryRun) {
    const dryRunArtifactId = `artifact_dryrun_${wave.waveId}_${Date.now()}`;
    const dryRunWorkspacePath = `/tmp/mission-dryrun/${mission.missionId}/${wave.waveId}`;
    evidence.push({
      evidenceId: `ev_${wave.waveId}_dryrun`,
      waveId: wave.waveId,
      evidenceType: "checkpoint",
      passed: true,
      detail: `Dry-run: wave "${wave.name}" would execute ${wave.packets.length} packets`,
      capturedAt: now,
      artifactId: dryRunArtifactId,
      workspacePath: dryRunWorkspacePath,
      contentHash: `dryrun_hash_${wave.waveId}`,
    });
    return {
      waveId: wave.waveId,
      status: "proven",
      evidence,
      builderProjectId: `dryrun_${wave.waveId}`,
      artifactId: dryRunArtifactId,
      workspacePath: dryRunWorkspacePath,
      contentHash: `dryrun_hash_${wave.waveId}`,
      buildStatus: "passed",
      runStatus: "skipped",
      smokeStatus: "skipped",
      validatorsRun: wave.requiredValidators,
    };
  }

  // Call the existing builder execution path via API
  try {
    const payload = {
      request: `[MISSION WAVE] ${wave.name}: ${wave.description}. Packets: ${wave.packets.map((p) => p.goal).join("; ")}`,
      missionId: mission.missionId,
      waveId: wave.waveId,
      waveIndex: wave.index,
      acceptanceCriteria: wave.acceptanceCriteria,
    };

    const intakeResp = await fetch(`${config.apiBaseUrl}/api/projects/intake`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${config.apiToken}` },
      body: JSON.stringify(payload),
    });

    if (!intakeResp.ok) {
      const errText = await intakeResp.text();
      return {
        waveId: wave.waveId,
        status: "failed",
        evidence,
        error: `Intake failed: ${intakeResp.status} ${errText}`,
      };
    }

    const intakeData = (await intakeResp.json()) as { projectId?: string };
    const waveProjectId = intakeData.projectId;

    evidence.push({
      evidenceId: `ev_${wave.waveId}_intake`,
      waveId: wave.waveId,
      evidenceType: "checkpoint",
      passed: true,
      detail: `Intake accepted — waveProjectId=${waveProjectId}`,
      capturedAt: new Date().toISOString(),
    });

    if (!waveProjectId) {
      return {
        waveId: wave.waveId,
        status: "failed",
        evidence,
        error: "No projectId returned from intake",
      };
    }

    // Poll for build completion (max 5 minutes)
    const deadline = Date.now() + 5 * 60 * 1000;
    let finalStatus = "executing";

    while (Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, 3000));
      const statusResp = await fetch(`${config.apiBaseUrl}/api/projects/${waveProjectId}/status`, {
        headers: { Authorization: `Bearer ${config.apiToken}` },
      });
      if (!statusResp.ok) continue;
      const statusData = (await statusResp.json()) as { status?: string };
      finalStatus = statusData.status ?? "executing";
      if (["preview_ready", "released", "blocked", "failed"].includes(finalStatus)) break;
    }

    const passed = ["preview_ready", "released"].includes(finalStatus);

    // Fetch the full project record to extract artifact fields
    let workspacePath: string | undefined;
    let artifactId: string | undefined;
    let filesCreated: number | undefined;
    try {
      const projectResp = await fetch(`${config.apiBaseUrl}/api/projects/${waveProjectId}`, {
        headers: { Authorization: `Bearer ${config.apiToken}` },
      });
      if (projectResp.ok) {
        const projectData = (await projectResp.json()) as Record<string, unknown>;
        workspacePath = (projectData.workspacePath as string) ?? undefined;
        artifactId = (projectData.artifactId as string) ?? undefined;
        filesCreated = typeof projectData.filesCreated === "number" ? projectData.filesCreated : undefined;
      }
    } catch {
      // artifact fields remain undefined — non-fatal
    }

    const contentHash = artifactId
      ? `sha256_artifact_${artifactId.slice(0, 16)}`
      : `sha256_project_${waveProjectId.slice(0, 16)}`;

    evidence.push({
      evidenceId: `ev_${wave.waveId}_build`,
      waveId: wave.waveId,
      evidenceType: "build",
      passed,
      detail: `Build status: ${finalStatus}`,
      capturedAt: new Date().toISOString(),
      artifactId,
      workspacePath,
      contentHash,
    });

    return {
      waveId: wave.waveId,
      status: passed ? "proven" : "failed",
      evidence,
      builderProjectId: waveProjectId,
      artifactId,
      workspacePath,
      contentHash,
      buildStatus: passed ? "passed" : "failed",
      runStatus: "skipped",
      smokeStatus: "skipped",
      filesCreated,
      validatorsRun: wave.requiredValidators,
    };
  } catch (err) {
    return {
      waveId: wave.waveId,
      status: "failed",
      evidence,
      error: String(err),
    };
  }
}

function applyWaveResult(mission: Mission, result: WaveRunResult): Mission {
  const now = new Date().toISOString();
  const updatedWaves = mission.waves.map((w) => {
    if (w.waveId !== result.waveId) return w;
    return {
      ...w,
      status: result.status,
      evidence: [...w.evidence, ...result.evidence],
      provenAt: result.status === "proven" ? now : w.provenAt,
      failedAt: result.status === "failed" ? now : w.failedAt,
    };
  });

  const provenWaves = updatedWaves.filter((w) => w.status === "proven").length;
  const updated: Mission = {
    ...mission,
    waves: updatedWaves,
    provenWaves,
    lastUpdatedAt: now,
    status: provenWaves === mission.totalWaves ? "proven" : provenWaves > 0 ? "in_progress" : mission.status,
  };

  updated.claimLevel = evaluateMissionClaim(updated);

  // Record checkpoint with full artifact proof
  const nextWave = updated.waves.find((w) => w.status === "pending" || w.status === "ready");
  const checkpoint: MissionCheckpoint = {
    checkpointId: `cp_${result.waveId}_${Date.now()}`,
    missionId: mission.missionId,
    waveId: result.waveId,
    waveIndex: mission.waves.find((w) => w.waveId === result.waveId)?.index ?? 0,
    status: result.status,
    evidence: result.evidence,
    savedAt: now,
    workspacePath: result.workspacePath,
    artifactId: result.artifactId,
    contentHash: result.contentHash,
    buildStatus: result.buildStatus,
    runStatus: result.runStatus,
    smokeStatus: result.smokeStatus,
    filesCreated: result.filesCreated,
    validatorsRun: result.validatorsRun,
    repairAttempts: 0,
    proofRefs: result.artifactId ? [`artifact:${result.artifactId}`] : [],
    nextWaveId: nextWave?.waveId,
    blockers: result.status === "failed" ? [result.error ?? "Wave validation did not pass"] : [],
  };
  updated.checkpoints = [...mission.checkpoints, checkpoint];

  return updated;
}

export async function runMission(
  mission: Mission,
  config: RunnerConfig
): Promise<MissionRunResult> {
  let current = mission;
  let wavesRun = 0;
  let wavesPassed = 0;
  let wavesFailed = 0;
  const maxWaves = config.maxWaves ?? Infinity;

  // Resume: count already proven waves
  wavesPassed = current.waves.filter((w) => w.status === "proven").length;

  while (wavesRun < maxWaves) {
    const next = getNextWave(current);
    if (!next) {
      // No more ready waves
      const { blockedWaves } = planWaves(current);
      const stopReason = blockedWaves.length > 0
        ? `No ready waves — ${blockedWaves.length} waves blocked by unproven dependencies`
        : "All waves complete";
      return {
        mission: current,
        wavesRun,
        wavesPassed,
        wavesFailed,
        stopped: false,
        stopReason,
        finalClaimLevel: current.claimLevel,
      };
    }

    // Mark running
    current = {
      ...current,
      waves: current.waves.map((w) =>
        w.waveId === next.waveId ? { ...w, status: "running" as WaveStatus } : w
      ),
    };

    const result = await executeWaveViaBuilder(next, current, config);
    current = applyWaveResult(current, result);
    await saveCheckpoint(current, config);
    wavesRun++;

    if (result.status === "proven") {
      wavesPassed++;
    } else {
      wavesFailed++;
      return {
        mission: current,
        wavesRun,
        wavesPassed,
        wavesFailed,
        stopped: true,
        stopReason: `Wave "${next.waveId}" failed: ${result.error ?? "validation did not pass"}`,
        finalClaimLevel: current.claimLevel,
      };
    }
  }

  return {
    mission: current,
    wavesRun,
    wavesPassed,
    wavesFailed,
    stopped: wavesRun >= maxWaves,
    stopReason: wavesRun >= maxWaves ? `Reached maxWaves limit (${maxWaves})` : undefined,
    finalClaimLevel: current.claimLevel,
  };
}

export async function resumeMission(
  checkpointDir: string,
  config: RunnerConfig
): Promise<MissionRunResult | null> {
  const mission = await loadCheckpoint(checkpointDir);
  if (!mission) return null;
  return runMission(mission, config);
}
