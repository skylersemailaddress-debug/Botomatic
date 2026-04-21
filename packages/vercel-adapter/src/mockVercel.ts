export interface PreviewDeploymentRecord {
  projectId: string;
  packetId: string;
  environment: "preview";
  url: string;
  status: "ready" | "building" | "failed";
}

export async function createPreviewDeployment(input: {
  projectId: string;
  packetId: string;
}): Promise<PreviewDeploymentRecord> {
  return {
    projectId: input.projectId,
    packetId: input.packetId,
    environment: "preview",
    url: `https://preview.example.com/${input.projectId}/${input.packetId}`,
    status: "ready"
  };
}
