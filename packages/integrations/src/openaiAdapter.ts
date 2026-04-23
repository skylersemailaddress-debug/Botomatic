export async function callOpenAI(input: {
  model: string;
  prompt: string;
}): Promise<{ result: string; confidence: number }> {
  // placeholder for real OpenAI API call
  return {
    result: `OpenAI(${input.model}): ${input.prompt}`,
    confidence: 0.8,
  };
}
