export type GeneratedAppReleaseContract = {
  appId: string;
  version: string;
  sourceTreePath: string;
  readme: string;
  installInstructions: string;
  envExample: string;
  buildCommand: string;
  testCommand: string;
  lintTypecheckCommand?: string;
  runtimeSmokeCommand: string;
  deploymentPlan: string;
  rollbackPlan: string;
  securityNotes: string;
  knownLimitations: string;
  evidenceManifest: string;
  isDemo: boolean;
  claimBoundary: string;
};
