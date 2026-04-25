export type CapturedArtifact = {
  id: string;
  type: "log" | "file" | "report";
  pathOrLabel: string;
  createdAt: string;
};

export function createCapturedArtifact(type: CapturedArtifact["type"], pathOrLabel: string): CapturedArtifact {
  return {
    id: `artifact_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    type,
    pathOrLabel,
    createdAt: new Date().toISOString(),
  };
}
