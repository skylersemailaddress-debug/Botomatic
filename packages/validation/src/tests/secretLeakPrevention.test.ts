import assert from "assert";
import fs from "fs";
import os from "os";
import path from "path";
import { validateSecretsCredentialManagementReadiness } from "../repoValidators/secretsCredentialManagementReadiness";

function write(root: string, rel: string, content: string) {
  const full = path.join(root, rel);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content, "utf8");
}

function fixtureRoot(): string { return fs.mkdtempSync(path.join(os.tmpdir(), "secret-leak-prevention-")); }

function base(root: string) {
  write(root, ".gitignore", ".env\n.env.*\n!.env.example\n");
  write(root, "packages/validation/src/repoValidators/secretsCredentialManagementReadiness.ts", "validator");
  write(root, "packages/validation/src/tests/secretLeakPrevention.test.ts", "test");
  write(root, "docs/secret-leak-prevention.md", "# Secret leak prevention\n\n## Scope\nmetadata-only plaintext\n\n## Non-goals\n");
  write(root, "packages/validation/src/runtime/secretsCredentialManagement.ts", "secretReferenceId secretUri secret:// metadata_only secretValueStored false buildDeploymentSecretPreflight plaintext");
  write(root, "apps/control-plane/src/services/secrets.ts", "metadata_only secretValueStored false");
  write(root, "release-evidence/runtime/secrets_credential_management_readiness_proof.json", '{"status":"passed"}');
}

function testPassesOnScopedPolicy() {
  const root = fixtureRoot();
  base(root);
  const res=validateSecretsCredentialManagementReadiness(root); assert.strictEqual(res.status, "passed");
}

function testFailsOnPlaintextLeak() {
  const root = fixtureRoot();
  base(root);
  write(root, "release-evidence/runtime/runtime.log", "token=sk_live_ABCDEF1234567890");
  const result = validateSecretsCredentialManagementReadiness(root);
  assert.strictEqual(result.status, "failed");
}

function run() {
  testPassesOnScopedPolicy();
  testFailsOnPlaintextLeak();
  console.log("secretLeakPrevention.test.ts passed");
}

run();
