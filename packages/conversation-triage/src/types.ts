export type TriageQuestion = {
  id: string;
  question: string;
  why: string;
  category: "scope" | "tech" | "users" | "business" | "platform";
  suggestedAnswers?: string[];
};

export type TriageAnalysis = {
  clearIntents: string[];      // clearly understood parts
  vagueAreas: string[];        // vague/ambiguous parts that need clarification
  contradictions: string[];    // conflicting requirements detected
  detectedDomain: string;      // e.g. "SaaS web app", "mobile app"
  detectedFeatures: string[];  // features mentioned
  targetedQuestions: TriageQuestion[];  // exactly 3-5 questions
  confidence: "high" | "medium" | "low";
  suggestedTitle: string;      // short name for the project
};

export type TriageResponse = {
  questionId: string;
  answer: string;
};

export type ClarifiedSpec = {
  title: string;
  summary: string;
  corePurpose: string;
  targetUsers: string;
  keyFeatures: string[];
  platform: string;
  techPreferences: string[];
  businessModel: string;
  outOfScope: string[];
  rawInput: string;
  triageResponses: TriageResponse[];
};
