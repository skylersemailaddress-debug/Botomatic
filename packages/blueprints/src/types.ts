export type Blueprint = {
  id: string;
  name: string;
  category: string;
  description: string;
  defaultPages: string[];
  defaultComponents: string[];
  defaultRoles: string[];
  defaultPermissions: string[];
  defaultEntities: string[];
  defaultRelationships: string[];
  defaultWorkflows: string[];
  defaultIntegrations: string[];
  requiredQuestions: string[];
  safeAssumptions: string[];
  riskyAssumptions: string[];
  recommendedStack: {
    frontend: string;
    backend: string;
    jobs?: string;
    deploy?: string;
  };
  acceptanceCriteria: string[];
  launchCriteria: string[];
  validationRules: string[];
  noPlaceholderRules: string[];
};
