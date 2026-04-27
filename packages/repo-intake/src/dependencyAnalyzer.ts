export type DependencySummary = {
  packageManagers: string[];
  keyDependencies: string[];
};

export function analyzeDependencies(input: {
  packageJson?: Record<string, any>;
  hasPnpmLock?: boolean;
  hasYarnLock?: boolean;
  hasPackageLock?: boolean;
}): DependencySummary {
  const packageManagers: string[] = [];
  if (input.hasPnpmLock) packageManagers.push("pnpm");
  if (input.hasYarnLock) packageManagers.push("yarn");
  if (input.hasPackageLock || packageManagers.length === 0) packageManagers.push("npm");

  const deps = {
    ...(input.packageJson?.dependencies || {}),
    ...(input.packageJson?.devDependencies || {}),
  };
  return {
    packageManagers,
    keyDependencies: Object.keys(deps).slice(0, 50),
  };
}
