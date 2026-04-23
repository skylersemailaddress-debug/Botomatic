export async function callClaude(input: {
  model: string;
  prompt: string;
}): Promise<{ result: string; confidence: number }> {
  // placeholder for real Claude API call
  return {
    result: `Claude(${input.model}): ${input.prompt}`,
    confidence: 0.82,
  };
}
