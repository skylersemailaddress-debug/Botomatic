import { getExecutionRun } from "./execution";
import { getProjectResume, getProjectState, type ProjectResumeState, type ProjectStateResponse } from "./projectState";
import { getProjectRuntimeState, type ProjectRuntimeState } from "./runtimeStatus";
import type { ApiResult } from "./truth";

export type FirstRunStepStatus = "not_started" | "available" | "in_progress" | "complete" | "blocked" | "unavailable";

export type FirstRunStep = {
  id: string;
  label: string;
  status: FirstRunStepStatus;
  detail?: string;
  actionLabel?: string;
  actionHref?: string;
  disabled?: boolean;
};

export type FirstRunState = {
  projectId: string;
  hasProjectState: boolean;
  hasObjective: boolean;
  hasNextStep: boolean;
  hasOrchestrationRun: boolean;
  hasExecutionRun: boolean;
  hasRuntimePreview: boolean;
  canLaunch: boolean;
  steps: FirstRunStep[];
  primaryAction?: FirstRunStep;
  message?: string;
};

type LaunchSignals = {
  launchProof?: boolean;
  launchReady?: boolean;
  launchReadiness?: boolean;
  deployment?: { ready?: boolean };
  proof?: { launch?: boolean };
  releaseEvidence?: { launchReady?: boolean };
  launch?: { proof?: boolean; ready?: boolean };
};

type DeriveInput = {
  projectId: string;
  resume?: ProjectResumeState;
  projectState?: ProjectStateResponse & LaunchSignals;
  execution?: { status?: string; jobs?: Array<{ status?: string }> };
  runtime?: ProjectRuntimeState;
};

function hasExplicitLaunchProof(projectState?: ProjectStateResponse & LaunchSignals): boolean {
  if (!projectState) return false;
  return Boolean(
    projectState.launchProof
    || projectState.launchReady
    || projectState.launchReadiness
    || projectState.deployment?.ready
    || projectState.proof?.launch
    || projectState.releaseEvidence?.launchReady
    || projectState.launch?.proof
    || projectState.launch?.ready,
  );
}

export function getFirstRunFallback(projectId: string): FirstRunState {
  const steps: FirstRunStep[] = [
    { id: "idea", label: "Describe your app idea", status: "available", detail: "No first-run state yet", actionLabel: "Describe your app idea" },
    { id: "orchestration", label: "Start orchestration", status: "not_started" },
    { id: "build_map", label: "Review build map", status: "unavailable", detail: "Project creation not connected" },
    { id: "runtime", label: "Review launch requirements", status: "blocked", detail: "Launch proof missing" },
  ];
  return { projectId, hasProjectState: false, hasObjective: false, hasNextStep: false, hasOrchestrationRun: false, hasExecutionRun: false, hasRuntimePreview: false, canLaunch: false, steps, primaryAction: steps[0], message: "No first-run state yet" };
}

export function deriveFirstRunState(input: DeriveInput): FirstRunState {
  const hasObjective = Boolean(input.resume?.objective || input.projectState?.objective);
  const hasNextStep = Boolean(input.resume?.nextStep || input.projectState?.nextStep);
  const hasOrchestrationRun = Boolean(input.resume?.activeRunId || input.resume?.latestRunId || input.projectState?.activeRunId || input.projectState?.latestRunId);
  const hasExecutionRun = Boolean(input.execution?.jobs?.length);
  const runtimeStatus = (input.runtime?.status || "").toLowerCase();
  const hasRuntimePreview = Boolean(input.runtime?.previewUrl) || runtimeStatus === "live" || runtimeStatus === "starting";
  const executionStatus = (input.execution?.status || "").toLowerCase();
  const executionBlocked = ["failed", "blocked", "cancelled"].includes(executionStatus) || Boolean(input.execution?.jobs?.some((j) => ["failed", "blocked", "cancelled"].includes(String(j.status || "").toLowerCase())));
  const hasLaunchProof = hasExplicitLaunchProof(input.projectState);
  const canLaunch = hasLaunchProof && !executionBlocked;

  const steps: FirstRunStep[] = [
    { id: "idea", label: "Describe your app idea", status: hasObjective ? "complete" : "available", detail: hasObjective ? "Objective saved" : "Use the main prompt to start" },
    { id: "orchestration", label: "Start orchestration", status: hasObjective ? (hasOrchestrationRun ? "complete" : "available") : "blocked", detail: !hasObjective ? "Describe your app idea first" : undefined },
    { id: "build_map", label: "Review build map", status: hasOrchestrationRun ? (hasExecutionRun ? "complete" : "in_progress") : "not_started" },
    { id: "execution", label: "Check execution results", status: hasExecutionRun ? (executionBlocked ? "blocked" : "in_progress") : "not_started" },
    { id: "runtime", label: canLaunch ? "Launch" : "Review launch requirements", status: canLaunch ? "available" : "blocked", detail: canLaunch ? "Launch proof present" : "Launch proof missing", disabled: !canLaunch },
  ];
  const primaryAction = steps.find((s) => s.status === "available" || s.status === "in_progress" || s.status === "blocked") ?? steps[0];
  return { projectId: input.projectId, hasProjectState: Boolean(input.projectState || input.resume), hasObjective, hasNextStep, hasOrchestrationRun, hasExecutionRun, hasRuntimePreview, canLaunch, steps, primaryAction };
}

export async function getFirstRunState(projectId: string): Promise<ApiResult<FirstRunState>> {
  const [resumeResult, stateResult, executionResult, runtime] = await Promise.all([getProjectResume(projectId), getProjectState(projectId), getExecutionRun(projectId), getProjectRuntimeState(projectId)]);
  if (!resumeResult.ok && !stateResult.ok && !executionResult.ok && !runtime.status && !runtime.previewUrl) return { ok: false, state: "empty", status: 404, message: "No first-run state yet" };
  return { ok: true, data: deriveFirstRunState({ projectId, resume: resumeResult.ok ? resumeResult.data : undefined, projectState: stateResult.ok ? (stateResult.data as ProjectStateResponse & LaunchSignals) : undefined, execution: executionResult.ok ? executionResult.data : undefined, runtime }) };
}
