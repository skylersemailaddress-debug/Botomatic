type RuleResult = { ok: boolean; issues: string[] };

export function validateCommercialReadiness(app: any): RuleResult {
  const checks: Array<[boolean, string]> = [
    [Boolean(app?.installPass), "Install check failed."],
    [Boolean(app?.buildPass), "Build check failed."],
    [Boolean(app?.testsPass), "Tests check failed."],
    [app?.lintConfigured ? Boolean(app?.lintPass) : true, "Lint check failed."],
    [app?.typecheckConfigured ? Boolean(app?.typecheckPass) : true, "Typecheck failed."],
    [Boolean(app?.routesExist), "Routes are missing."],
    [Boolean(app?.formsHaveHandlers), "Forms are not connected to real handlers."],
    [app?.dataRequired ? Boolean(app?.dbSchemaExists) : true, "Database schema/migrations are missing for required data flows."],
    [Boolean(app?.authIsReal), "Auth is not production-real."],
    [app?.multiRole ? Boolean(app?.roleGuardsExist) : true, "Role guards are missing for multi-role app."],
    [Boolean(app?.uxLoadingState), "Loading state is missing."],
    [Boolean(app?.uxEmptyState), "Empty state is missing."],
    [Boolean(app?.uxErrorState), "Error state is missing."],
    [Boolean(app?.envManifestExists), "Env var manifest is missing."],
    [Boolean(app?.deploymentInstructions), "Deployment instructions are missing."],
    [Boolean(app?.readmeLaunchInstructions), "README launch instructions missing."],
    [Boolean(app?.readmeAssumptions), "README assumptions section missing."],
    [!Boolean(app?.hasPlaceholderPaths), "Placeholder production paths detected."],
  ];

  const issues = checks.filter(([ok]) => !ok).map(([, issue]) => issue);
  return { ok: issues.length === 0, issues };
}
