export type RepoSnapshot = {
  rootPath: string;
  capturedAt: string;
  files: string[];
  packageManagers: string[];
};

export function createRepoSnapshot(input: {
  rootPath: string;
  files: string[];
  packageManagers?: string[];
}): RepoSnapshot {
  return {
    rootPath: input.rootPath,
    capturedAt: new Date().toISOString(),
    files: input.files,
    packageManagers: input.packageManagers || [],
  };
}
