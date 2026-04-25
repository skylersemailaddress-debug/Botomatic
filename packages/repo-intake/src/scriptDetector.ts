export type ScriptSummary = {
  installScript: string | null;
  buildScript: string | null;
  testScript: string | null;
  lintScript: string | null;
  typecheckScript: string | null;
};

export function detectScripts(packageJson?: Record<string, any>): ScriptSummary {
  const scripts = packageJson?.scripts || {};
  return {
    installScript: scripts.install || null,
    buildScript: scripts.build || null,
    testScript: scripts.test || null,
    lintScript: scripts.lint || null,
    typecheckScript: scripts.typecheck || scripts.tsc || null,
  };
}
