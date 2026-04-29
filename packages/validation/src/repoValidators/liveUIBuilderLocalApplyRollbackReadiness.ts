import fs from "fs";
import path from "path";
import { type RepoValidatorResult } from "../repoValidators";

export function validateLiveUIBuilderLocalApplyRollbackReadiness(root: string): RepoValidatorResult {
  const checks = ["packages/ui-preview-engine/src/uiSourceApplyTransaction.ts","packages/ui-preview-engine/src/uiSourceApplyProof.ts","packages/ui-preview-engine/src/tests/uiSourceApplyTransaction.test.ts","packages/ui-preview-engine/src/tests/uiSourceApplyProof.test.ts","packages/ui-preview-engine/src/tests/fixtures/localApplyFixture.ts","package.json","packages/validation/src/repoValidators.ts"];
  const has=(r:string)=>fs.existsSync(path.join(root,r)); const read=(r:string)=>fs.readFileSync(path.join(root,r),"utf8");
  const tx = has(checks[0])?read(checks[0]):""; const proof=has(checks[1])?read(checks[1]):""; const pkg=has("package.json")?read("package.json"):"";
  const ok = checks.every(has) && tx.includes("beforeSnapshot") && tx.includes("confirmationMarker") && tx.includes("allowWrites") && tx.includes("release-evidence/runtime") && tx.includes("rollbackDeletedFiles") && tx.includes("path escapes project root") && proof.includes("Local apply proof verifies guarded file-write behavior only. It does not deploy, export, or prove runtime correctness.") && pkg.includes("test:ui-source-apply-transaction") && pkg.includes("test:ui-source-apply-proof") && pkg.includes("test:universal") && !(`${tx}\n${proof}`.toLowerCase().includes("deploy success"));
  return { name: "Validate-Botomatic-LiveUIBuilderLocalApplyRollbackReadiness", status: ok?"passed":"failed", summary: ok?"Local apply transaction, rollback proof, scripts, and safeguards are wired.":"Local apply rollback readiness is incomplete.", checks };
}
