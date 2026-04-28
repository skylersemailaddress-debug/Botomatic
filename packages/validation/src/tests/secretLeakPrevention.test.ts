import assert from "assert";
import fs from "fs";
import os from "os";
import path from "path";
import { validateSecretsCredentialManagementReadiness } from "../repoValidators/secretsCredentialManagementReadiness";

function writeFile(root: string, rel: string, content: string) { const full = path.join(root, rel); fs.mkdirSync(path.dirname(full), { recursive: true }); fs.writeFileSync(full, content, "utf8"); }
function fixtureRoot() { return fs.mkdtempSync(path.join(os.tmpdir(), "secret-leak-readiness-")); }

function base(root: string) {
  const req = [
    "packages/validation/src/runtime/secretsCredentialManagement.ts","packages/validation/src/runtime/proofSecretsCredentialManagement.ts","packages/validation/src/repoValidators/secretsCredentialManagementReadiness.ts","release-evidence/runtime/secrets_credential_management_readiness_proof.json","apps/control-plane/src/components/overview/SecretsCredentialsPanel.tsx","apps/control-plane/src/services/secrets.ts","apps/control-plane/src/components/overview/DeploymentPanel.tsx","apps/control-plane/src/app/projects/[projectId]/vault/page.tsx",
  ];
  req.forEach((p) => writeFile(root, p, "ok"));
  writeFile(root, ".gitignore", ".env\n.env.*\n!.env.example\n");
  writeFile(root, "LEGAL_CLAIM_BOUNDARIES.md", "legal");
  writeFile(root, "EVIDENCE_BOUNDARY_POLICY.md", "evidence");
  writeFile(root, "docs/secret-leak-prevention.md", "static pattern scanning\nnot exhaustive");
  writeFile(root, ".env.example", "OPENAI_API_KEY=secret://openai/prod/api\n");
}

(function run(){
  let root = fixtureRoot(); base(root); writeFile(root, "docs/runbook.md", "OPENAI_API_KEY=sk-ABCDEFGHIJKLMNOPQRSTUVWX12345");
  assert.strictEqual(validateSecretsCredentialManagementReadiness(root).status, "failed");

  root = fixtureRoot(); base(root); writeFile(root, "config/app.json", '{"ref":"secret://vercel/prod/token"}');
  assert.strictEqual(validateSecretsCredentialManagementReadiness(root).status, "passed");

  root = fixtureRoot(); base(root); writeFile(root, ".env.example", "STRIPE_SECRET_KEY=sk_live_1234567890abcdef\n");
  assert.strictEqual(validateSecretsCredentialManagementReadiness(root).status, "failed");

  root = fixtureRoot(); base(root); writeFile(root, ".env.example", "STRIPE_SECRET_KEY=<REQUIRED_SECRET_REF>\n");
  assert.strictEqual(validateSecretsCredentialManagementReadiness(root).status, "passed");

  root = fixtureRoot(); base(root); writeFile(root, "node_modules/pkg/readme.md", "GITHUB_TOKEN=ghp_abcdefghijklmnopqrstuvwxyzABCD");
  assert.strictEqual(validateSecretsCredentialManagementReadiness(root).status, "passed");

  root = fixtureRoot(); base(root); const summary = validateSecretsCredentialManagementReadiness(root).summary.toLowerCase();
  assert(summary.includes("non-exhaustive") && summary.includes("files"));

  root = fixtureRoot(); base(root); writeFile(root, "docs/secret-leak-prevention.md", "static pattern scanning\nnot exhaustive\nguaranteed zero leaks");
  assert.strictEqual(validateSecretsCredentialManagementReadiness(root).status, "failed");
  console.log("secretLeakPrevention.test.ts passed");
})();
