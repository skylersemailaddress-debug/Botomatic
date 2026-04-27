import { getJson } from "./api";

export type ProofStatusResponse = {
  benchmark: {
    exists: boolean;
    averageScoreOutOf10: number;
    universalScoreOutOf10: number;
    criticalFailures: number;
    caseCount: number;
    launchablePass: boolean;
    universalPass: boolean;
  };
  runtimeProof: {
    greenfield: { exists: boolean; status: string; generatedOutputReality: string | null };
    dirtyRepo: { exists: boolean; status: string; validatorRan: boolean };
    selfUpgrade: { exists: boolean; status: string; validatorWeakeningDetected: boolean };
    universalPipeline: { exists: boolean; status: string; domainCount: number; failedDomains: number };
  };
  generatedAppReadiness: {
    generatedOutputEvidencePresent: boolean;
    artifactManifestPresent: boolean;
    noPlaceholderScanPresent: boolean;
    launchPacketPresent: boolean;
    generationReality: string | null;
    caveat: string | null;
  };
  lastProofRun: string | null;
};

export async function getProofStatus(projectId: string) {
  return getJson<ProofStatusResponse>(`/api/projects/${encodeURIComponent(projectId)}/ui/proof-status`);
}
