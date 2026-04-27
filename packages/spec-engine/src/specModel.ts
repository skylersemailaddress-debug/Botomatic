export type RiskLevel = "low" | "medium" | "high";

export type RecommendationStatus = "pending" | "accepted" | "rejected";

export type SpecRecommendation = {
  id: string;
  area: string;
  recommendation: string;
  reason: string;
  confidence: number;
  importance: number;
  risk: RiskLevel;
  defaultDecision: string;
  requiresApproval: boolean;
  status: RecommendationStatus;
};

export type SpecAssumption = {
  id: string;
  field: string;
  decision: string;
  reason: string;
  importance: number;
  risk: RiskLevel;
  madeBy: string;
  requiresApproval: boolean;
  approved: boolean;
  canChangeLater: boolean;
  createdAt: string;
};

export type SpecCompletenessBreakdown = {
  criticalCompleteness: number;
  commercialCompleteness: number;
  implementationCompleteness: number;
  launchCompleteness: number;
  riskCompleteness: number;
};

export type MasterSpec = {
  appName: string;
  appType: string;
  targetUsers: string[];
  customerSegments: string[];
  coreProblem: string;
  coreOutcome: string;
  businessModel: string;
  pricingModel: string;
  primaryUserJourneys: string[];
  pages: string[];
  components: string[];
  roles: string[];
  permissions: string[];
  dataEntities: string[];
  relationships: string[];
  workflows: string[];
  stateMachines: string[];
  integrations: string[];
  payments: string[];
  notifications: string[];
  filesAndMedia: string[];
  adminTools: string[];
  analytics: string[];
  contentCms: string[];
  authModel: string;
  tenancyModel: string;
  securityRequirements: string[];
  complianceRequirements: string[];
  deploymentTarget: string;
  envVars: string[];
  brandDirection: string;
  uiStyle: string;
  responsiveRequirements: string[];
  accessibilityRequirements: string[];
  acceptanceCriteria: string[];
  launchCriteria: string[];
  assumptions: SpecAssumption[];
  openQuestions: string[];
  recommendations: SpecRecommendation[];
  excludedItems: string[];
  risks: string[];
  readinessScore: number;
  completeness: SpecCompletenessBreakdown;
};

export type ClarificationItem = {
  id: string;
  field: string;
  question: string;
  importance: number;
  risk: RiskLevel;
  mustAsk: boolean;
  suggestedDefault?: string;
  requiresApproval: boolean;
};

export type BuildContract = {
  id: string;
  projectId: string;
  appSummary: string;
  targetUsers: string[];
  businessModel: string;
  pages: string[];
  roles: string[];
  permissions: string[];
  dataModel: {
    entities: string[];
    relationships: string[];
  };
  workflows: string[];
  integrations: string[];
  payments: string[];
  notifications: string[];
  adminTools: string[];
  authRbac: string;
  deploymentTarget: string;
  complianceSecurity: string[];
  brandUiDirection: string;
  acceptanceCriteria: string[];
  launchCriteria: string[];
  assumptions: SpecAssumption[];
  excludedItems: string[];
  risks: string[];
  unresolvedQuestions: string[];
  readinessScore: number;
  readyToBuild: boolean;
  blockers: string[];
  approvedAt?: string;
  approvedBy?: string;
  createdAt: string;
  updatedAt: string;
};

export type BuildBlockStatus = {
  blocked: boolean;
  blockers: string[];
  readiness: SpecCompletenessBreakdown;
  unresolvedHighRiskQuestions: number;
  hasBuildContract: boolean;
  hasCriticalContradiction: boolean;
};
