const DEMO_MODE_VALUE = process.env.NEXT_PUBLIC_BOTOMATIC_DEMO_MODE;

export function isDemoMode(): boolean {
  return DEMO_MODE_VALUE === "true";
}

export function assertNoDemoDataForRealProject<T>(value: T, fallback: T): T {
  return isDemoMode() ? value : fallback;
}

export function getProjectShellData(projectId: string) {
  return {
    projectId,
    demoMode: isDemoMode(),
  };
}
