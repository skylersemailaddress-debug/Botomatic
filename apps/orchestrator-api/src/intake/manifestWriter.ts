import fs from "fs";
import path from "path";

export type IntakeManifest = {
  sourceType: string;
  sourceUri: string;
  provider: string;
  accepted: boolean;
  rejected: boolean;
  sizeBytes: number | null;
  fileCount: number;
  skippedPaths: string[];
  detectedLanguages: string[];
  detectedFrameworks: string[];
  detectedPackageManagers: string[];
  detectedRiskSignals: string[];
  secretScanResult: {
    status: "passed" | "flagged";
    findings: string[];
  };
  safetyChecks: Array<{ check: string; status: "passed" | "blocked" | "pending"; detail: string }>;
  extractedTextSummary: string;
  artifactPaths: string[];
  nextRecommendedAction: string;
};

export function redactSourceUri(uri: string): string {
  if (!uri) return "";
  const redacted = uri
    .replace(/([?&](?:token|access_token|auth|key|signature|sig)=[^&]+)/gi, "$1[REDACTED]")
    .replace(/https:\/\/([^:@/]+):([^@/]+)@/gi, "https://$1:[REDACTED]@");
  return redacted;
}

export function writeIntakeManifest(rootDir: string, sourceId: string, manifest: IntakeManifest): string {
  const manifestDir = path.join(rootDir, "release-evidence", "runtime", "intake", sourceId);
  fs.mkdirSync(manifestDir, { recursive: true });
  const manifestPath = path.join(manifestDir, "intake_manifest.json");
  fs.writeFileSync(manifestPath, JSON.stringify({ ...manifest, sourceUri: redactSourceUri(manifest.sourceUri) }, null, 2), "utf8");
  return manifestPath;
}
