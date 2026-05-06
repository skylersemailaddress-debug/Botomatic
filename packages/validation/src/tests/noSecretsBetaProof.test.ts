import assert from "node:assert";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { generateNoSecretsBetaProof, redactSecretText, scanText } from "../runtime/noSecretsBetaProof";

function write(root: string, rel: string, content: string) {
  const full = path.join(root, rel);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content, "utf8");
}

function fixtureRoot(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "no-secrets-beta-proof-"));
}

function base(root: string) {
  write(root, "package.json", JSON.stringify({ name: "fixture" }));
  write(root, "src/index.ts", "export const placeholder = '<REQUIRED_SECRET_REF>';\n");
  write(root, "release-evidence/manifest.json", JSON.stringify({ ok: true }));
  write(root, "receipts/run/log.txt", "token=[REDACTED]\n");
  write(root, "release-evidence/generated-apps/app/.env.example", "OPENAI_API_KEY=<REQUIRED_SECRET_REF>\n");
}

function obviousFakeSecret(): string {
  return ["sk-proj", "abcdefghijklmnopqrstuvwxyz", "1234567890abcdefghij"].join("-");
}

function testCleanProofPasses() {
  const root = fixtureRoot();
  base(root);
  const proof = generateNoSecretsBetaProof(root);
  assert.strictEqual(proof.signals.source_scan_clean, true);
  assert.strictEqual(proof.signals.release_evidence_scan_clean, true);
  assert.strictEqual(proof.signals.logs_scan_clean, true);
  assert.strictEqual(proof.signals.generated_apps_scan_clean, true);
  assert.strictEqual(proof.signals.ui_api_response_redaction_verified, true);
}

function testSeededFixtureSecretFails() {
  const root = fixtureRoot();
  base(root);
  write(root, "tests/fixtures/seeded-api-response.json", JSON.stringify({ apiKey: obviousFakeSecret() }));
  const proof = generateNoSecretsBetaProof(root);
  assert.strictEqual(proof.signals.source_scan_clean, false);
  assert(proof.scans.source.findings.some((finding) => finding.file.endsWith("tests/fixtures/seeded-api-response.json")));
}

function testRedactionRemovesUiApiSecrets() {
  const leaked = `Authorization: Bearer ghp_${"a".repeat(36)} and JWT_SECRET=${"b".repeat(32)}`;
  const redacted = redactSecretText(leaked);
  assert.notStrictEqual(redacted, leaked);
  assert.strictEqual(scanText("test", "redacted", redacted).length, 0);
}

function run() {
  testCleanProofPasses();
  testSeededFixtureSecretFails();
  testRedactionRemovesUiApiSecrets();
  console.log("noSecretsBetaProof.test.ts passed");
}

run();
