export type WorkspaceView = "overview" | "activity" | "quality";

const ALLOWED_VIEWS: WorkspaceView[] = ["overview", "activity", "quality"];

export function getValidatedWorkspaceView(input?: string | null): WorkspaceView {
  if (!input) return "overview";
  const candidate = input.toLowerCase() as WorkspaceView;
  return ALLOWED_VIEWS.includes(candidate) ? candidate : "overview";
}
