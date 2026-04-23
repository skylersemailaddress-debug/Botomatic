type RambleInput = {
  projectId: string;
  currentTruth: any;
  history?: any[];
};

export function runRambleAnalysis(input: RambleInput) {
  const suggestions: string[] = [];

  if (!input.currentTruth.entities?.length) {
    suggestions.push("Define core entities (e.g., users, records, transactions)");
  }

  if (!input.currentTruth.workflows?.length) {
    suggestions.push("Define key workflows (e.g., approval, assignment, notifications)");
  }

  if (!input.currentTruth.integrations?.length) {
    suggestions.push("Consider integrations (payments, messaging, auth)");
  }

  return {
    projectId: input.projectId,
    suggestions,
    generatedAt: new Date().toISOString()
  };
}
