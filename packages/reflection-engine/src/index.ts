export type ReflectionNote = {
  area: string;
  observation: string;
  revision: string;
};

export function reflectAndRevise(input: { failedValidators: string[]; executionErrors: string[] }): ReflectionNote[] {
  const sources = [...input.failedValidators, ...input.executionErrors];
  return sources.map((source) => ({
    area: source,
    observation: "Detected gap in current execution state.",
    revision: `Revise implementation and re-validate: ${source}`,
  }));
}
