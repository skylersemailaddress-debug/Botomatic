import fs from "fs";
import path from "path";
import type { RepoValidatorResult } from "../repoValidators";

function read(root: string, rel: string): string { return fs.readFileSync(path.join(root, rel), "utf8"); }
function has(root: string, rel: string): boolean { return fs.existsSync(path.join(root, rel)); }

export function validateEditableUIDocumentModelReadiness(root: string): RepoValidatorResult {
  const checks = [
    "packages/ui-preview-engine/src/uiDocumentModel.ts",
    "packages/ui-preview-engine/src/index.ts",
    "packages/ui-preview-engine/src/tests/uiDocumentModel.test.ts",
    "package.json",
  ];
  if (!checks.every((c) => has(root, c))) {
    return { name: "Validate-Botomatic-EditableUIDocumentModelReadiness", status: "failed", summary: "Editable UI document model files/exports/tests are missing.", checks };
  }
  const moduleText = read(root, checks[0]);
  const indexText = read(root, checks[1]);
  const testsText = read(root, checks[2]);
  const packageText = read(root, checks[3]);
  const hasCaveat = moduleText.includes("does not implement command parsing") && moduleText.includes("live preview mutation") && moduleText.includes("source-file sync");
  const hasExports = indexText.includes("uiDocumentModel");
  const hasScript = packageText.includes("test:ui-document-model");
  const hasNoCompletionClaim = !/live ui builder is complete|full live visual ui builder proven/i.test(`${moduleText}\n${testsText}`);
  const ok = hasCaveat && hasExports && hasScript && hasNoCompletionClaim;
  return { name: "Validate-Botomatic-EditableUIDocumentModelReadiness", status: ok ? "passed" : "failed", summary: ok ? "Editable UI document model foundation, caveat, exports, and tests are in place." : "Editable UI document model readiness checks failed.", checks };
}
