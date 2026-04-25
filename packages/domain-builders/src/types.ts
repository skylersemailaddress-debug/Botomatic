export type DomainBuilder = {
  id: string;
  name: string;
  requiredSpecs: string[];
  supportedStacks: string[];
  defaultArchitecture: string;
  riskyDecisions: string[];
  requiredClarifyingQuestions: string[];
  buildCommands: string[];
  testCommands: string[];
  validationCommands: string[];
  deploymentOrExportPath: string;
  commercialReadinessRubric: string[];
  noPlaceholderRules: string[];
  repairStrategy: string[];
};
