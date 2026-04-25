"use server";

import { getApiBaseUrl } from "./api";

export type IntakeResponse = {
  projectId: string;
  status: string;
  actorId: string;
};

export async function createLaunchProject(
  projectName: string = "Launch Project"
): Promise<IntakeResponse> {
  const apiBaseUrl = getApiBaseUrl();
  const intakeUrl = `${apiBaseUrl}/api/projects/intake`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  // Add Authorization header if dev bearer token is provided
  if (process.env.NEXT_PUBLIC_DEV_BEARER_TOKEN) {
    headers["Authorization"] = `Bearer ${process.env.NEXT_PUBLIC_DEV_BEARER_TOKEN}`;
  }

  const response = await fetch(intakeUrl, {
    method: "POST",
    headers,
    body: JSON.stringify({
      name: projectName,
      request:
        "Launch a new project with Botomatic control plane.",
    }),
  });

  if (!response.ok) {
    let errorMessage = `Project intake failed: ${response.status}`;
    try {
      const data = await response.json();
      if (data.error) {
        errorMessage = data.error;
      }
    } catch {
      // Fall back to status-only error message
    }
    throw new Error(errorMessage);
  }

  return response.json() as Promise<IntakeResponse>;
}
