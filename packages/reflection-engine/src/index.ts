export type ReflectionNote = {
  area: string;
  observation: string;
  revision: string;
  severity: "critical" | "high" | "medium";
  autoFixable: boolean;
};

function classifySource(source: string): {
  observation: string;
  revision: string;
  severity: "critical" | "high" | "medium";
  autoFixable: boolean;
} {
  const lower = source.toLowerCase();

  if (/validatenoplaceholders|placeholder/.test(lower)) {
    return {
      observation: "Placeholder tokens detected in generated output",
      revision: "Replace all TODO, FIXME, mock, fake-auth patterns with real production code",
      severity: "critical",
      autoFixable: false,
    };
  }
  if (/validatebuildsuccess|build/.test(lower)) {
    return {
      observation: "Build failed in generated app",
      revision: "Check package.json scripts, resolve missing dependencies, fix TypeScript errors",
      severity: "high",
      autoFixable: false,
    };
  }
  if (/validatetests|test/.test(lower)) {
    return {
      observation: "Test suite not passing",
      revision: "Add missing test files, fix import paths, ensure test runner is configured",
      severity: "high",
      autoFixable: false,
    };
  }
  if (/validatesecurity|security/.test(lower)) {
    return {
      observation: "Security scan found vulnerabilities",
      revision: "Run npm audit fix, update vulnerable dependencies, remove hardcoded secrets",
      severity: "critical",
      autoFixable: true,
    };
  }
  if (/nofakesystems|fake/.test(lower)) {
    return {
      observation: "Fake or mock systems detected in production code",
      revision: "Replace mock implementations with real API calls and real data stores",
      severity: "critical",
      autoFixable: false,
    };
  }

  return {
    observation: `Validator ${source} reported a failure`,
    revision: `Investigate and fix the root cause of ${source} failure, then re-run validation`,
    severity: "medium",
    autoFixable: false,
  };
}

export function reflectAndRevise(input: { failedValidators: string[]; executionErrors: string[] }): ReflectionNote[] {
  const sources = [...input.failedValidators, ...input.executionErrors];
  return sources.map((source) => {
    const { observation, revision, severity, autoFixable } = classifySource(source);
    return {
      area: source,
      observation,
      revision,
      severity,
      autoFixable,
    };
  });
}
