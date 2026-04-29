import fs from "fs";
import path from "path";
import type { RepoValidatorResult } from "../repoValidators";

function read(root: string, rel: string): string { return fs.readFileSync(path.join(root, rel), "utf8"); }
function has(root: string, rel: string): boolean { return fs.existsSync(path.join(root, rel)); }

export function validateUIEditCommandParserReadiness(root: string): RepoValidatorResult {
  const checks = [
    "packages/ui-preview-engine/src/uiEditCommand.ts",
    "packages/ui-preview-engine/src/index.ts",
    "packages/ui-preview-engine/src/tests/uiEditCommand.test.ts",
    "package.json",
  ];
  if (!checks.every((c) => has(root, c))) {
    return { name: "Validate-Botomatic-UIEditCommandParserReadiness", status: "failed", summary: "UI edit command parser files/exports/tests are missing.", checks };
  }
  const moduleText = read(root, checks[0]);
  const indexText = read(root, checks[1]);
  const testText = read(root, checks[2]);
  const packageText = read(root, checks[3]);
  const requiredKinds = ["add", "remove", "move", "resize", "duplicate", "replace", "rewriteText", "restyle", "retheme", "addPage", "removePage", "changeLayout", "changeResponsiveBehavior", "bindData", "bindAction", "connectForm"];

  const hasCaveat = moduleText.includes("structured UI edit commands only") && moduleText.includes("does not mutate the UI document") && moduleText.includes("does not update the preview") && moduleText.includes("does not sync source files") && moduleText.includes("does not prove full live visual UI builder completion");
  const hasExports = indexText.includes("uiEditCommand");
  const hasScript = packageText.includes("test:ui-edit-command");
  const kindsPresent = requiredKinds.every((k) => moduleText.includes(`\"${k}\"`) || moduleText.includes(`'${k}'`));
  const hasNoForbiddenClaims = !/mutate the ui document|update the preview|sync source files/.test(testText.toLowerCase()) || testText.toLowerCase().includes("does not");
  const ok = hasCaveat && hasExports && hasScript && kindsPresent && hasNoForbiddenClaims;
  return { name: "Validate-Botomatic-UIEditCommandParserReadiness", status: ok ? "passed" : "failed", summary: ok ? "UI edit command parser schema, caveat, exports, required kinds, and tests are in place." : "UI edit command parser readiness checks failed.", checks };
}
