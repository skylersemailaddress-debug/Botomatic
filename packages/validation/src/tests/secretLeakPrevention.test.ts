import assert from "assert";
import fs from "fs";
import os from "os";
import path from "path";
import { validateSecretsCredentialManagementReadiness } from "../repoValidators/secretsCredentialManagementReadiness";

function write(root: string, rel: string, content: string) { const full = path.join(root, rel); fs.mkdirSync(path.dirname(full), { recursive: true }); fs.writeFileSync(full, content, "utf8"); }
function fixtureRoot(): string { return fs.mkdtempSync(path.join(os.tmpdir(), "secret-leak-prevention-")); }

function base(root: string) {
  write(root, ".gitignore", ".env\n.env.*\n!.env.example\n");
  write(root, ".env.example", "OPENAI_API_KEY=<REQUIRED_SECRET_REF>\nDEPLOY_TOKEN=secret://prod/deploy/token\nSAMPLE=replace_at_runtime\n");
  write(root, "packages/validation/src/repoValidators/secretsCredentialManagementReadiness.ts", "validator");
  write(root, "packages/validation/src/tests/secretLeakPrevention.test.ts", "test");
  write(root, "docs/secret-leak-prevention.md", "# DEPLOY-001\n\nstatic pattern scanning\nnot exhaustive\nno \"zero leaks proven\" claim\nscan scope\nskip scope\n");
  write(root, "packages/validation/src/runtime/secretsCredentialManagement.ts", "secretReferenceId secretUri secret:// metadata_only secretValueStored buildDeploymentSecretPreflight");
  write(root, "apps/control-plane/src/services/secrets.ts", "metadata_only secretValueStored");
  write(root, "README.md", "safe readme");
  write(root, "config/app.json", '{"ok":true}');
}

function testPlaintextSecretInDocsFails() { const r = fixtureRoot(); base(r); write(r, "docs/a.md", "leak sk_live_ABCDEF1234567890"); assert.strictEqual(validateSecretsCredentialManagementReadiness(r).status, "failed"); }
function testSecretRefPasses() { const r = fixtureRoot(); base(r); const res=validateSecretsCredentialManagementReadiness(r); assert.strictEqual(res.status, "passed"); }
function testEnvExampleRealisticFails() { const r = fixtureRoot(); base(r); write(r, ".env.example", "OPENAI_API_KEY=sk-abcdefghijklmnopqrstuvwxyz12345\n"); assert.strictEqual(validateSecretsCredentialManagementReadiness(r).status, "failed"); }
function testEnvExamplePlaceholderPasses() { const r = fixtureRoot(); base(r); write(r, ".env.example", "OPENAI_API_KEY=<REQUIRED_SECRET_REF>\nTOKEN=\n"); assert.strictEqual(validateSecretsCredentialManagementReadiness(r).status, "passed"); }
function testSkippedDirsNotScanned() { const r = fixtureRoot(); base(r); write(r, "node_modules/a.js", "sk_live_ABCDEF1234567890"); write(r, "build/a.txt", "ghp_abcdefghijklmnopqrstuvwxyz12345"); assert.strictEqual(validateSecretsCredentialManagementReadiness(r).status, "passed"); }
function testSummaryReportsScope() { const r = fixtureRoot(); base(r); const res = validateSecretsCredentialManagementReadiness(r); assert(res.summary.includes("scanned")); }
function testOverclaimWordingFails() { const r = fixtureRoot(); base(r); write(r, "docs/secret-leak-prevention.md", "zero leaks proven"); assert.strictEqual(validateSecretsCredentialManagementReadiness(r).status, "failed"); }

function run() { testPlaintextSecretInDocsFails(); testSecretRefPasses(); testEnvExampleRealisticFails(); testEnvExamplePlaceholderPasses(); testSkippedDirsNotScanned(); testSummaryReportsScope(); testOverclaimWordingFails(); console.log("secretLeakPrevention.test.ts passed"); }
run();
