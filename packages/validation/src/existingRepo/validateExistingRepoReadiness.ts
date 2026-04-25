import { validateRepoNoPlaceholders } from "./validateRepoNoPlaceholders";
import { validateRepoBuild } from "./validateRepoBuild";
import { validateRepoTests } from "./validateRepoTests";
import { validateRepoSecurity } from "./validateRepoSecurity";
import { validateRepoDeployment } from "./validateRepoDeployment";
import { validateRepoProductCompleteness } from "./validateRepoProductCompleteness";

export type ExistingRepoValidationResult = {
  ok: boolean;
  results: Array<{ name: string; ok: boolean; issues: string[] }>;
};

export function validateExistingRepoReadiness(input: {
  sourceText: string;
  installWorks: boolean;
  buildWorks: boolean;
  testsPass: boolean;
  testsWereAddedIfMissing: boolean;
  authReal: boolean;
  roleGuardsReal: boolean;
  fakeAuthOrPaymentOrMessaging: boolean;
  deploymentPathReal: boolean;
  envManifestExists: boolean;
  launchReadmeExists: boolean;
  coreWorkflowsComplete: boolean;
  dataPersistenceReal: boolean;
  uiStatesComplete: boolean;
}): ExistingRepoValidationResult {
  const checks = [
    { name: "noPlaceholders", result: validateRepoNoPlaceholders(input.sourceText) },
    { name: "build", result: validateRepoBuild({ installWorks: input.installWorks, buildWorks: input.buildWorks }) },
    { name: "tests", result: validateRepoTests({ testsPass: input.testsPass, testsWereAddedIfMissing: input.testsWereAddedIfMissing }) },
    {
      name: "security",
      result: validateRepoSecurity({
        authReal: input.authReal,
        roleGuardsReal: input.roleGuardsReal,
        fakeAuthOrPaymentOrMessaging: input.fakeAuthOrPaymentOrMessaging,
      }),
    },
    {
      name: "deployment",
      result: validateRepoDeployment({
        deploymentPathReal: input.deploymentPathReal,
        envManifestExists: input.envManifestExists,
        launchReadmeExists: input.launchReadmeExists,
      }),
    },
    {
      name: "productCompleteness",
      result: validateRepoProductCompleteness({
        coreWorkflowsComplete: input.coreWorkflowsComplete,
        dataPersistenceReal: input.dataPersistenceReal,
        uiStatesComplete: input.uiStatesComplete,
      }),
    },
  ];

  return {
    ok: checks.every((c) => c.result.ok),
    results: checks.map((c) => ({ name: c.name, ok: c.result.ok, issues: c.result.issues })),
  };
}
