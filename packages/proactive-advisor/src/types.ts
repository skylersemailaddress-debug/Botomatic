export type ProactiveBlocker = {
  id: string;
  severity: "P0" | "P1" | "P2";
  title: string;
  description: string;
  suggestedFix: string;
  packetsThatWillFail?: string[];  // which packet types will fail if unresolved
};

export type SmartDefault = {
  id: string;
  area: string;          // e.g. "Authentication", "Database", "Deployment"
  suggestion: string;    // e.g. "Use NextAuth.js for authentication"
  reason: string;        // why this is the smart choice for this domain
  changeCommand: string; // natural language override e.g. "use Clerk instead"
  applied: boolean;      // whether the user has accepted it
};

export type Contradiction = {
  id: string;
  field1: string;
  field2: string;
  description: string;
  resolution: string;    // suggested resolution
};

export type CreativeMode = {
  id: string;
  title: string;
  description: string;  // one sentence
  platform: string;
  estimatedComplexity: "simple" | "medium" | "complex";
};

export type ProactiveAdvisory = {
  blockers: ProactiveBlocker[];
  suggestions: SmartDefault[];
  contradictions: Contradiction[];
  creativeModes: CreativeMode[];  // 3 interpretations when spec is very vague
  readinessVerdict: "ready" | "needs_clarification" | "blocked";
  summary: string;  // one sentence summary of the advisory state
};
