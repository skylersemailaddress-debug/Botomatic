import { validateSpecCompleteness } from "./validateSpecCompleteness";
import { validateNoPlaceholders } from "./validateNoPlaceholders";
import { validateAuthRbac } from "./validateAuthRbac";
import { validateDataModel } from "./validateDataModel";
import { validateRoutes } from "./validateRoutes";
import { validateForms } from "./validateForms";
import { validateWorkflows } from "./validateWorkflows";
import { validateIntegrations } from "./validateIntegrations";
import { validatePayments } from "./validatePayments";
import { validateNotifications } from "./validateNotifications";
import { validateResponsiveUi } from "./validateResponsiveUi";
import { validateUxStates } from "./validateUxStates";
import { validateSecurity } from "./validateSecurity";
import { validateDeployment } from "./validateDeployment";
import { validateCommercialReadiness } from "./validateCommercialReadiness";
import { validateEmittedOutput } from "./validateEmittedOutput";

export type GeneratedAppValidationResult = {
  ok: boolean;
  scoreOutOf10: number;
  criticalFailed: boolean;
  results: Array<{ name: string; ok: boolean; issues: string[] }>;
};

export function validateGeneratedApp(input: {
  spec: any;
  sourceText: string;
  appSignals: any;
  emittedOutputDir?: string;
}): GeneratedAppValidationResult {
  const checks = [
    { name: "spec", result: validateSpecCompleteness(input.spec), critical: true },
    { name: "noPlaceholders", result: validateNoPlaceholders(input.sourceText), critical: true },
    { name: "authRbac", result: validateAuthRbac(input.spec), critical: true },
    { name: "dataModel", result: validateDataModel(input.spec), critical: false },
    { name: "routes", result: validateRoutes(input.spec), critical: true },
    { name: "forms", result: validateForms(input.spec), critical: true },
    { name: "workflows", result: validateWorkflows(input.spec), critical: true },
    { name: "integrations", result: validateIntegrations(input.spec), critical: false },
    { name: "payments", result: validatePayments(input.spec), critical: false },
    { name: "notifications", result: validateNotifications(input.spec), critical: false },
    { name: "responsiveUi", result: validateResponsiveUi(input.spec), critical: false },
    { name: "uxStates", result: validateUxStates(input.spec), critical: true },
    { name: "security", result: validateSecurity(input.spec), critical: true },
    { name: "deployment", result: validateDeployment(input.spec), critical: true },
    { name: "commercialReadiness", result: validateCommercialReadiness(input.appSignals), critical: true },
    {
      name: "emittedOutput",
      result: input.emittedOutputDir
        ? validateEmittedOutput(input.emittedOutputDir)
        : { ok: true, issues: [] },
      critical: Boolean(input.emittedOutputDir),
    },
    {
      name: "launchPackage",
      result: input.emittedOutputDir
        ? validateEmittedOutput(input.emittedOutputDir)
        : { ok: true, issues: [] },
      critical: Boolean(input.emittedOutputDir),
    },
  ];

  const passed = checks.filter((c) => c.result.ok).length;
  const criticalFailed = checks.some((c) => c.critical && !c.result.ok);
  const scoreOutOf10 = Number(((passed / checks.length) * 10).toFixed(2));

  return {
    ok: !criticalFailed,
    scoreOutOf10,
    criticalFailed,
    results: checks.map((c) => ({ name: c.name, ok: c.result.ok, issues: c.result.issues })),
  };
}
