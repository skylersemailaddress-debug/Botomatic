import assert from "node:assert";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { AddressInfo } from "node:net";
import express from "express";
import {
  createCommercialRateLimitMiddleware,
  createSameOriginCsrfMiddleware,
  createSecurityHeadersMiddleware,
  redactSensitive,
  resetCommercialRateLimitStateForTests,
} from "../../../../apps/orchestrator-api/src/security/commercialHardening";
import {
  IntakeValidationError,
  processUploadedFile,
  sanitizeArchivePath,
  sniffUploadContentPolicy,
} from "../../../../apps/orchestrator-api/src/intake/largeFileIntake";

async function withServer<T>(app: express.Express, fn: (baseUrl: string) => Promise<T>): Promise<T> {
  const server = app.listen(0);
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const { port } = server.address() as AddressInfo;
  try { return await fn(`http://127.0.0.1:${port}`); }
  finally { await new Promise<void>((resolve, reject) => server.close((e) => (e ? reject(e) : resolve()))); }
}

async function testRateLimitBlocksAbuse() {
  resetCommercialRateLimitStateForTests();
  const app = express();
  app.use(createCommercialRateLimitMiddleware({ operator: { max: 2, windowMs: 60_000 } }));
  app.post("/api/projects/:projectId/operator/send", (_req, res) => res.json({ ok: true }));
  await withServer(app, async (baseUrl) => {
    const headers = { "content-type": "application/json", "x-user-id": "abuser" };
    assert.strictEqual((await fetch(`${baseUrl}/api/projects/proj_1/operator/send`, { method: "POST", headers, body: "{}" })).status, 200);
    assert.strictEqual((await fetch(`${baseUrl}/api/projects/proj_1/operator/send`, { method: "POST", headers, body: "{}" })).status, 200);
    const blocked = await fetch(`${baseUrl}/api/projects/proj_1/operator/send`, { method: "POST", headers, body: "{}" });
    assert.strictEqual(blocked.status, 429);
    assert.strictEqual(blocked.headers.get("x-ratelimit-bucket"), "operator");
  });
}

async function testCsrfBlocksCrossSiteMutationAndPublicGetStaysPublic() {
  const app = express();
  app.use(createSecurityHeadersMiddleware());
  app.use(createSameOriginCsrfMiddleware());
  app.get("/health", (_req, res) => res.json({ status: "ok" }));
  app.post("/api/projects/proj_1/build/start", (_req, res) => res.json({ ok: true }));
  await withServer(app, async (baseUrl) => {
    const publicRes = await fetch(`${baseUrl}/health`);
    assert.strictEqual(publicRes.status, 200);
    assert.ok(publicRes.headers.get("content-security-policy")?.includes("frame-ancestors 'none'"));
    const blocked = await fetch(`${baseUrl}/api/projects/proj_1/build/start`, {
      method: "POST",
      headers: { origin: "https://evil.example", "sec-fetch-site": "cross-site" },
    });
    assert.strictEqual(blocked.status, 403);
    assert.strictEqual((await blocked.json() as any).code, "CSRF_BLOCKED");
  });
}

function makeZip(zipPath: string, entries: Record<string, string>) {
  const script = [
    "import sys, zipfile",
    "zip_path = sys.argv[1]",
    "entries = sys.argv[2:]",
    "with zipfile.ZipFile(zip_path, 'w', compression=zipfile.ZIP_DEFLATED) as z:",
    "    for item in entries:",
    "        name, body = item.split('=', 1)",
    "        if body.startswith('REPEAT_A:'):" ,
    "            body = 'A' * int(body.split(':', 1)[1])",
    "        z.writestr(name, body)",
  ].join("\n");
  const args = ["-c", script, zipPath, ...Object.entries(entries).map(([name, body]) => `${name}=${body}`)];
  const result = spawnSync("python3", args, { encoding: "utf8" });
  assert.strictEqual(result.status, 0, result.stderr);
}

async function testUploadTraversalBlocked() {
  assert.throws(() => sanitizeArchivePath("../escape.txt"), IntakeValidationError);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "botomatic-traversal-"));
  const zipPath = path.join(dir, "traversal.zip");
  makeZip(zipPath, { "../escape.txt": "owned" });
  await assert.rejects(
    () => processUploadedFile({ uploadPath: zipPath, originalName: "traversal.zip", mimeType: "application/zip", sizeBytes: fs.statSync(zipPath).size, workDir: dir, limits: { maxUploadMb: 100, maxExtractedMb: 500, maxZipFiles: 1000, maxUploadBytes: 100 * 1024 * 1024, maxExtractedBytes: 500 * 1024 * 1024 } }),
    (error: any) => error?.code === "UNSAFE_ARCHIVE_PATH" || String(error?.message || error).includes("invalid relative path"),
  );
}

async function testArchiveBombBlocked() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "botomatic-bomb-"));
  const zipPath = path.join(dir, "bomb.zip");
  makeZip(zipPath, { "huge.txt": "REPEAT_A:" + String(1024 * 1024) });
  await assert.rejects(
    () => processUploadedFile({ uploadPath: zipPath, originalName: "bomb.zip", mimeType: "application/zip", sizeBytes: fs.statSync(zipPath).size, workDir: dir, limits: { maxUploadMb: 100, maxExtractedMb: 1, maxZipFiles: 1000, maxUploadBytes: 100 * 1024 * 1024, maxExtractedBytes: 10 * 1024 } }),
    (error: any) => error?.code === "EXTRACTED_SIZE_TOO_LARGE" || error?.code === "ARCHIVE_BOMB_DETECTED",
  );
}

function testMimeSniffingAndSecretsRedacted() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "botomatic-sniff-"));
  const fakePdf = path.join(dir, "fake.pdf");
  fs.writeFileSync(fakePdf, "not a pdf");
  const sniff = sniffUploadContentPolicy(fakePdf, "fake.pdf", "application/pdf");
  assert.strictEqual(sniff.ok, false);
  const jwtPrefix = ["eyJ", "abcdefghi"].join("");
  const fakeJwt = `${jwtPrefix}.${jwtPrefix}.abcdefghi`;
  const fakeProviderKey = ["sk", "live", "1234567890abcdef"].join("-");
  const redacted = JSON.stringify(redactSensitive({ authorization: `Bearer ${fakeJwt}`, nested: { openai: fakeProviderKey } }));
  assert.ok(redacted.includes("[REDACTED]"));
  assert.ok(!redacted.includes(fakeProviderKey));
  assert.ok(!redacted.includes(jwtPrefix));
}

async function main() {
  await testRateLimitBlocksAbuse();
  await testCsrfBlocksCrossSiteMutationAndPublicGetStaysPublic();
  await testUploadTraversalBlocked();
  await testArchiveBombBlocked();
  testMimeSniffingAndSecretsRedacted();
  console.log("commercialSecurityHardening.test.ts passed");
}

main().catch((error) => { console.error(error); process.exit(1); });
