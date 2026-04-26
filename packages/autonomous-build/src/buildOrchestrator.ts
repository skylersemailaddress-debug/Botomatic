import { createMilestoneGraph } from "./milestonePlanner";
import { ingestComplexSpec, type SpecIngestionInput } from "./specIngestion";
import { createInitialCheckpoint, updateCheckpoint, type AutonomousBuildRunState } from "./checkpointStore";
import { evaluateHumanEscalation } from "./humanEscalationPolicy";
import { runAutonomousRepairLoop } from "./autonomousRepairLoop";
import { assembleFinalReleaseBundle } from "./finalReleaseAssembler";

export type StartAutonomousBuildInput = {
  runId: string;
  specInput: SpecIngestionInput;
  repairBudget?: number;
  safeDefaults?: boolean;
};

export type ResumeAutonomousBuildInput = {
  approvedBlockerCodes?: string[];
  repairBudget?: number;
};

function processMilestones(
  state: AutonomousBuildRunState,
  repairBudget: number,
  approvedBlockerCodes: string[] = []
): AutonomousBuildRunState {
  let next = state;

  for (const milestone of state.milestoneGraph) {
    if (next.checkpoint.completedMilestones.includes(milestone.id)) {
      continue;
    }

    const escalation = milestone.blockerPolicy === "human_escalation_high_risk"
      ? evaluateHumanEscalation({ code: "live_deployment_approval", detail: `Milestone ${milestone.id} is high-risk by policy.` })
      : evaluateHumanEscalation({ code: "runtime_failure", detail: `Milestone ${milestone.id} can run autonomously.` });

    if (escalation.escalate && !approvedBlockerCodes.includes(milestone.id)) {
      next = updateCheckpoint(next, {
        currentMilestone: milestone.id,
        failedMilestone: milestone.id,
        nextAction: `Await human blocker approval for ${milestone.id}`,
        log: `Paused at ${milestone.id}: ${escalation.reason}`,
      });
      next = {
        ...next,
        status: "paused_human_blocker",
        humanBlockers: [
          ...next.humanBlockers,
          {
            code: milestone.id,
            detail: escalation.reason,
            requiredAction: "approve-blocker",
            approved: false,
          },
        ],
      };
      return next;
    }

    const repair = runAutonomousRepairLoop({
      runState: next,
      milestoneId: milestone.id,
      failureCode: "runtime_failure",
      failureDetail: `Milestone ${milestone.id} execution attempt`,
      repairBudget,
    });

    if (!repair.repaired) {
      next = updateCheckpoint(next, {
        currentMilestone: milestone.id,
        failedMilestone: milestone.id,
        repairAttempts: next.checkpoint.repairAttempts + 1,
        nextAction: `Repair failed for ${milestone.id}; ${repair.strategy}`,
        log: repair.log,
      });
      next = { ...next, status: "failed" };
      return next;
    }

    next = updateCheckpoint(next, {
      currentMilestone: milestone.id,
      completedMilestones: [...next.checkpoint.completedMilestones, milestone.id],
      failedMilestone: null,
      repairAttempts: next.checkpoint.repairAttempts + 1,
      artifactPaths: Array.from(new Set([...next.checkpoint.artifactPaths, ...milestone.artifacts])),
      nextAction: `Proceed to next milestone after ${milestone.id}`,
      log: `Milestone ${milestone.id} completed with autonomous policy (${repair.strategy}).`,
    });
  }

  const finalBundle = assembleFinalReleaseBundle(next);
  next = updateCheckpoint(next, {
    currentMilestone: "final_release_assembly",
    artifactPaths: Array.from(new Set([...next.checkpoint.artifactPaths, finalBundle.finalReleaseEvidencePath, finalBundle.launchPackagePath])),
    nextAction: "Autonomous build run complete.",
    log: "Final release bundle assembled.",
  });

  return {
    ...next,
    status: "completed",
    finalReleaseAssembled: finalBundle.assembled,
  };
}

export function startAutonomousBuildRun(input: StartAutonomousBuildInput): AutonomousBuildRunState {
  const ingestion = ingestComplexSpec(input.specInput);
  const graph = createMilestoneGraph(ingestion);
  const initial: AutonomousBuildRunState = {
    runId: input.runId,
    status: "running",
    milestoneGraph: graph,
    checkpoint: createInitialCheckpoint(input.runId, graph[0]?.id || "foundation_runtime"),
    humanBlockers: [],
    startedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    finalReleaseAssembled: false,
  };

  return processMilestones(initial, input.repairBudget ?? 3, []);
}

export function resumeAutonomousBuildRun(
  current: AutonomousBuildRunState,
  input: ResumeAutonomousBuildInput
): AutonomousBuildRunState {
  const approved = new Set([...(input.approvedBlockerCodes || [])]);
  const previouslyApproved = current.humanBlockers.filter((b) => b.approved).map((b) => b.code);
  for (const code of previouslyApproved) approved.add(code);

  const unblocked = {
    ...current,
    status: "running" as const,
    humanBlockers: current.humanBlockers.map((blocker) =>
      approved.has(blocker.code) ? { ...blocker, approved: true } : blocker
    ),
  };

  return processMilestones(unblocked, input.repairBudget ?? 3, Array.from(approved));
}
