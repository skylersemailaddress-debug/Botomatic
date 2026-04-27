import fs from "fs";
import path from "path";
import type { RepoValidatorResult } from "../repoValidators";

function has(root: string, rel: string): boolean {
  return fs.existsSync(path.join(root, rel));
}

function read(root: string, rel: string): string {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

function result(ok: boolean, summary: string, checks: string[]): RepoValidatorResult {
  return {
    name: "Validate-Botomatic-UploadPlanHandoffReadiness",
    status: ok ? "passed" : "failed",
    summary,
    checks,
  };
}

export function validateUploadPlanHandoffReadiness(root: string): RepoValidatorResult {
  const requiredFiles = [
    "apps/control-plane/src/components/chat/chatCommandExecutor.ts",
    "apps/control-plane/src/components/chat/ConversationPane.tsx",
    "apps/control-plane/src/components/chat/systemIntelligence.ts",
    "apps/control-plane/src/services/actions.ts",
    "packages/validation/src/tests/uploadPlanHandoff.test.ts",
  ];
  const checks: string[] = [];

  for (const rel of requiredFiles) {
    if (!has(root, rel)) {
      return result(false, `Upload-plan handoff file missing: ${rel}`, checks);
    }
  }

  const executor = read(root, "apps/control-plane/src/components/chat/chatCommandExecutor.ts");
  const pane = read(root, "apps/control-plane/src/components/chat/ConversationPane.tsx");
  const intelligence = read(root, "apps/control-plane/src/components/chat/systemIntelligence.ts");
  const actions = read(root, "apps/control-plane/src/services/actions.ts");

  // 1. compileProject must be imported in chatCommandExecutor
  if (!executor.includes("compileProject")) {
    return result(false, "chatCommandExecutor.ts does not import compileProject — compile step missing from pipeline", checks);
  }
  checks.push("chatCommandExecutor imports compileProject");

  // 2. runPipelineFromIntakeContext must call compileProject before planProject
  const compilePosInExecutor = executor.indexOf("compileProject(projectId)");
  const planPosInExecutor = executor.indexOf("planProject(projectId)");
  if (compilePosInExecutor === -1 || planPosInExecutor === -1) {
    return result(false, "runPipelineFromIntakeContext must call both compileProject and planProject", checks);
  }
  if (compilePosInExecutor >= planPosInExecutor) {
    return result(false, "compileProject must appear before planProject in runPipelineFromIntakeContext", checks);
  }
  checks.push("compileProject called before planProject in pipeline");

  // 3. Fallback retry pattern: compile fallback when plan 404 No master truth
  if (
    !executor.includes("no master truth") &&
    !executor.includes("master truth")
  ) {
    return result(false, "runPipelineFromIntakeContext must handle 404 No master truth with fallback retry", checks);
  }
  checks.push("fallback retry on /plan 404 No master truth present");

  // 4. planning-sequence-error thrown (not generic error) when compile fails
  if (!executor.includes("planning-sequence-error")) {
    return result(false, "chatCommandExecutor must throw planning-sequence-error on compile failure", checks);
  }
  checks.push("planning-sequence-error error class used in compile failure path");

  // 5. ConversationPane separates upload error from pipeline error
  if (!pane.includes("Pipeline failed")) {
    return result(false, "ConversationPane.tsx must report pipeline failures as 'Pipeline failed', not 'Upload failed'", checks);
  }
  if (!pane.includes("pipelineError") && !pane.includes("pipelin")) {
    return result(false, "ConversationPane.tsx must have a dedicated catch for pipeline errors separate from upload errors", checks);
  }
  checks.push("ConversationPane separates upload vs pipeline error messages");

  // 6. classifyError handles 413
  if (
    !intelligence.includes("413") ||
    !intelligence.includes("resource_limit_failure")
  ) {
    return result(false, "classifyError in systemIntelligence.ts must classify 413 as resource_limit_failure", checks);
  }
  checks.push("classifyError handles 413 → resource_limit_failure");

  // 7. classifyError handles master truth / planning-sequence-error
  if (
    !intelligence.includes("planning-sequence-error") &&
    !intelligence.includes("no master truth")
  ) {
    return result(false, "classifyError must handle 'no master truth' as planning-sequence-error", checks);
  }
  checks.push("classifyError handles no master truth → planning-sequence-error");

  // 8. compileProject exported from actions
  if (!actions.includes("compileProject")) {
    return result(false, "services/actions.ts must export compileProject", checks);
  }
  checks.push("compileProject exported from services/actions.ts");

  // 9. Tests exist
  if (!has(root, "packages/validation/src/tests/uploadPlanHandoff.test.ts")) {
    return result(false, "uploadPlanHandoff.test.ts missing", checks);
  }
  const testFile = read(root, "packages/validation/src/tests/uploadPlanHandoff.test.ts");
  const expectedTests = [
    "compile before plan",
    "413",
    "No master truth",
    "Upload failed",
    "resource_limit_failure",
  ];
  for (const term of expectedTests) {
    if (!testFile.includes(term)) {
      return result(false, `uploadPlanHandoff.test.ts missing coverage for: ${term}`, checks);
    }
  }
  checks.push("uploadPlanHandoff.test.ts covers required scenarios");

  return result(true, "Upload-plan handoff sequencing is correct: compile before plan, 413 classified, master truth gate enforced.", checks);
}
