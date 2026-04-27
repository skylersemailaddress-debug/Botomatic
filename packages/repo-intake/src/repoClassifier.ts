export type RepoClassification = {
  isDirtyRepo: boolean;
  isBrokenRepo: boolean;
  isScaffoldLikely: boolean;
  inferredInputPath: "new_idea" | "existing_repo" | "broken_app";
};

export function classifyRepo(input: {
  hasBuildFailures: boolean;
  hasTestFailures: boolean;
  hasPlaceholderSignals: boolean;
  hasExistingCodebase: boolean;
}): RepoClassification {
  const isBrokenRepo = input.hasBuildFailures || input.hasTestFailures;
  const isDirtyRepo = input.hasPlaceholderSignals || isBrokenRepo;
  const isScaffoldLikely = input.hasPlaceholderSignals;
  const inferredInputPath = !input.hasExistingCodebase
    ? "new_idea"
    : isBrokenRepo
    ? "broken_app"
    : "existing_repo";
  return { isDirtyRepo, isBrokenRepo, isScaffoldLikely, inferredInputPath };
}
