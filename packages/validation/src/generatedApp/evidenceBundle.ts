export type EvidenceCommandOutput = {
  command: string;
  exitCode: number;
  stdout: string;
  stderr: string;
  durationMs: number;
  timestamp: string;
};

export type EvidenceBundleChecksum = {
  algorithm: "sha256";
  value: string;
};

export type GeneratedAppEvidenceBundle = {
  schemaVersion: "1";
  appId: string;
  generatedAt: string;
  nodeVersion: string;
  npmVersion: string;
  commandOutputs: {
    install?: EvidenceCommandOutput;
    build?: EvidenceCommandOutput;
    test?: EvidenceCommandOutput;
    lint?: EvidenceCommandOutput;
    typecheck?: EvidenceCommandOutput;
    runtimeSmoke?: EvidenceCommandOutput;
    dependencyAudit?: EvidenceCommandOutput;
  };
  checksums: EvidenceBundleChecksum[];
  accessibilityCheckResult?: {
    tool: string;
    passed: boolean;
    summary: string;
  };
  passFail: {
    install: boolean;
    build: boolean;
    test: boolean;
    runtimeSmoke: boolean;
    noSecrets: boolean;
    noPlaceholders: boolean;
    dependencyAudit: boolean;
    accessibility: boolean;
  };
  overallPass: boolean;
  caveats: string[];
};

export const EVIDENCE_BUNDLE_CAVEATS = [
  "Evidence bundle records command outputs and timestamps only.",
  "Evidence bundle is not launch-readiness proof.",
  "Runtime smoke validation is required before any launch-readiness claim.",
  "Dependency audit exceptions must be documented if audit is skipped.",
] as const;

function detectNpmVersion(): string {
  const userAgent = process.env.npm_config_user_agent || "";
  const match = userAgent.match(/npm\/(\S+)/i);
  return match?.[1] || "unknown";
}

export function createEmptyEvidenceBundle(appId: string): GeneratedAppEvidenceBundle {
  return {
    schemaVersion: "1",
    appId,
    generatedAt: new Date().toISOString(),
    nodeVersion: process.version,
    npmVersion: detectNpmVersion(),
    commandOutputs: {},
    checksums: [],
    passFail: {
      install: false,
      build: false,
      test: false,
      runtimeSmoke: false,
      noSecrets: false,
      noPlaceholders: false,
      dependencyAudit: false,
      accessibility: false,
    },
    overallPass: false,
    caveats: [...EVIDENCE_BUNDLE_CAVEATS],
  };
}
