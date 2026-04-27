export type RepoRiskScan = {
  placeholderSignals: string[];
  fakeIntegrationSignals: string[];
  securityRiskSignals: string[];
};

const PLACEHOLDERS = ["todo", "fixme", "placeholder", "coming soon", "lorem ipsum", "not implemented"];
const FAKE_INTEGRATIONS = ["mock", "stub", "fake auth", "fake payment", "dummy"]; 
const SECURITY_RISKS = ["api key", "secret", "password", "allow all", "*/*"]; 

export function scanRepoRisk(textCorpus: string): RepoRiskScan {
  const lower = textCorpus.toLowerCase();
  return {
    placeholderSignals: PLACEHOLDERS.filter((t) => lower.includes(t)),
    fakeIntegrationSignals: FAKE_INTEGRATIONS.filter((t) => lower.includes(t)),
    securityRiskSignals: SECURITY_RISKS.filter((t) => lower.includes(t)),
  };
}
