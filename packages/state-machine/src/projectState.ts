export type ProjectState =
  | "intake"
  | "clarifying"
  | "compiling_truth"
  | "awaiting_architecture_approval"
  | "planning"
  | "queued"
  | "executing"
  | "validating"
  | "repairing"
  | "preview_ready"
  | "awaiting_release_approval"
  | "released"
  | "blocked";

export function canTransition(from: ProjectState, to: ProjectState): boolean {
  const transitions: Record<ProjectState, ProjectState[]> = {
    intake: ["clarifying", "compiling_truth"],
    clarifying: ["compiling_truth"],
    compiling_truth: ["awaiting_architecture_approval"],
    awaiting_architecture_approval: ["planning", "blocked"],
    planning: ["queued"],
    queued: ["executing"],
    executing: ["validating", "repairing", "blocked"],
    validating: ["preview_ready", "repairing", "blocked"],
    repairing: ["executing", "blocked"],
    preview_ready: ["awaiting_release_approval"],
    awaiting_release_approval: ["released", "blocked"],
    released: [],
    blocked: []
  };

  return transitions[from]?.includes(to) ?? false;
}
