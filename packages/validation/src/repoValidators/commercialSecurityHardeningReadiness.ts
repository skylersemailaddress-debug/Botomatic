import fs from "fs";
import path from "path";
import type { RepoValidatorResult } from "../repoValidators";

function read(root: string, rel: string): string { return fs.readFileSync(path.join(root, rel), "utf8"); }
function has(root: string, rel: string): boolean { return fs.existsSync(path.join(root, rel)); }
function result(ok: boolean, summary: string, checks: string[]): RepoValidatorResult {
  return { name: "Validate-Botomatic-CommercialSecurityHardening", status: ok ? "passed" : "failed", summary, checks };
}

export function validateCommercialSecurityHardening(root: string): RepoValidatorResult {
  const checks = [
    "apps/orchestrator-api/src/security/commercialHardening.ts",
    "apps/orchestrator-api/src/intake/largeFileIntake.ts",
    "apps/orchestrator-api/src/server_app.ts",
    "apps/control-plane/src/server/security.ts",
    "apps/control-plane/src/middleware.ts",
    "apps/control-plane/src/app/api/auth/login/route.ts",
    "docs/security/COMMERCIAL_SECURITY_HARDENING.md",
    "packages/validation/src/tests/commercialSecurityHardening.test.ts",
    "package.json",
  ];
  for (const file of checks) if (!has(root, file)) return result(false, `${file} is missing.`, checks);

  const hardening = read(root, checks[0]);
  const intake = read(root, checks[1]);
  const server = read(root, checks[2]);
  const cpSecurity = read(root, checks[3]);
  const middleware = read(root, checks[4]);
  const login = read(root, checks[5]);
  const docs = read(root, checks[6]);
  const tests = read(root, checks[7]);
  const pkg = read(root, checks[8]);

  const requiredSignals: Array<[boolean, string]> = [
    [hardening.includes("auth") && hardening.includes("operator") && hardening.includes("build") && hardening.includes("upload") && hardening.includes("deployment") && hardening.includes("ai_provider"), "rate limit buckets for auth/operator/build/upload/deployment/AI routes"],
    [server.includes("createCommercialRateLimitMiddleware") && login.includes("enforceLoginRateLimit"), "Express and login rate limiting wired"],
    [hardening.includes("createSameOriginCsrfMiddleware") && cpSecurity.includes("blockCrossSiteMutation") && middleware.includes("blockCrossSiteMutation"), "same-origin/CSRF protection wired"],
    [intake.includes("maxUploadBytes") && intake.includes("sanitizeArchivePath") && intake.includes("TOO_MANY_FILES") && intake.includes("EXTRACTED_SIZE_TOO_LARGE") && intake.includes("ARCHIVE_BOMB_DETECTED"), "upload size/traversal/archive bomb protections"],
    [intake.includes("sniffUploadContentPolicy") && intake.includes("CONTENT_SNIFF_MISMATCH") && server.includes("isBlockedFileExtension"), "MIME/content sniffing and blocked extension policy"],
    [intake.includes("malwareScanningHook") && docs.includes("BOTOMATIC_MALWARE_SCANNER"), "malware scanning provider hook documented"],
    [server.includes("app.use(\"/api/projects\", requireApiAuth(config))") && server.includes("tenantPrefix") && server.includes("projectPrefix"), "upload auth and tenant/project-scoped artifact IDs"],
    [hardening.includes("redactSensitive") && server.includes("redactSensitive") && docs.includes("Provider keys are not injected into generated apps"), "secret redaction and provider-key boundary"],
    [cpSecurity.includes("Content-Security-Policy") && cpSecurity.includes("Strict-Transport-Security") && cpSecurity.includes("X-Content-Type-Options") && cpSecurity.includes("Referrer-Policy") && cpSecurity.includes("X-Frame-Options"), "browser security headers"],
    [login.includes("httpOnly: true") && login.includes("sameSite: \"lax\"") && login.includes("secure: process.env.NODE_ENV === \"production\""), "secure cookie settings"],
    [tests.includes("testRateLimitBlocksAbuse") && tests.includes("testCsrfBlocksCrossSiteMutation") && tests.includes("testUploadTraversalBlocked") && tests.includes("testArchiveBombBlocked") && tests.includes("testMimeSniffingAndSecretsRedacted"), "required security tests"],
    [pkg.includes("test:commercial-security-hardening"), "commercial security hardening test script"],
  ];

  const missing = requiredSignals.filter(([ok]) => !ok).map(([, label]) => label);
  if (missing.length) return result(false, `Missing commercial security hardening signals: ${missing.join(", ")}.`, checks);
  return result(true, "Commercial security hardening enforced: rate limits, CSRF, upload safety, secret redaction, headers/cookies, tests, and docs are present.", checks);
}
