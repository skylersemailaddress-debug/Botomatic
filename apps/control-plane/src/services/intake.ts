import { postJson } from "./api";

export type IntakeResponse = {
  projectId: string;
  status: string;
  actorId: string;
};

export async function createLaunchProject(
  projectName: string = "Launch Project"
): Promise<IntakeResponse> {
  return postJson<IntakeResponse>("/api/projects/intake", {
    name: projectName,
    request: "Launch a new project with Botomatic control plane.",
  });
}
