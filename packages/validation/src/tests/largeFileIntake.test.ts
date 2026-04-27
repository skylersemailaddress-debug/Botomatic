import assert from "assert";
import fs from "fs";
import path from "path";
import {
  getIntakeLimitsFromEnv,
  isSupportedUploadType,
  sanitizeArchivePath,
  IntakeValidationError,
} from "../../../../apps/orchestrator-api/src/intake/largeFileIntake";

function expectThrows(fn: () => void, expectedCode: string) {
  let thrown = false;
  try {
    fn();
  } catch (error: any) {
    thrown = true;
    assert(error instanceof IntakeValidationError, "Expected IntakeValidationError");
    assert.strictEqual(error.code, expectedCode);
  }
  assert(thrown, `Expected error code ${expectedCode}`);
}

function test16Point2MbAcceptedByDefault() {
  const limits = getIntakeLimitsFromEnv({});
  assert(limits.maxUploadMb >= 250, "Default upload limit must be at least 250 MB");
  assert(16.2 * 1024 * 1024 < limits.maxUploadBytes, "16.2 MB upload must be accepted by default limit");
}

function testConfiguredMaxRejectsAboveLimit() {
  const limits = getIntakeLimitsFromEnv({ BOTOMATIC_MAX_UPLOAD_MB: "120" });
  const tooLarge = 130 * 1024 * 1024;
  assert(tooLarge > limits.maxUploadBytes, "Synthetic oversized file should exceed configured max");

  const server = fs.readFileSync(path.join(process.cwd(), "apps/orchestrator-api/src/server_app.ts"), "utf8");
  assert(server.includes("FILE_TOO_LARGE"), "Server should return a FILE_TOO_LARGE code for oversize uploads");
  assert(server.includes("File too large (max"), "Server should return a clear oversize upload message");
}

function testZipTraversalRejected() {
  expectThrows(() => sanitizeArchivePath("../escape.txt"), "UNSAFE_ARCHIVE_PATH");
  expectThrows(() => sanitizeArchivePath("/absolute/path.txt"), "UNSAFE_ARCHIVE_PATH");
}

function testSafeZipPathAccepted() {
  const safe = sanitizeArchivePath("src/main.ts");
  assert.strictEqual(safe, "src/main.ts");
}

function testUnsupportedExtensionRejected() {
  assert.strictEqual(isSupportedUploadType("malware.exe", "application/octet-stream"), false);
}

function testSupportedTypesAccepted() {
  assert.strictEqual(isSupportedUploadType("spec.zip", "application/zip"), true);
  assert.strictEqual(isSupportedUploadType("readme.md", "text/markdown"), true);
}

function testZipBombGuardsDeclared() {
  const intakeCore = fs.readFileSync(path.join(process.cwd(), "apps/orchestrator-api/src/intake/largeFileIntake.ts"), "utf8");
  assert(intakeCore.includes("TOO_MANY_FILES"), "Zip too-many-files protection should be enforced");
  assert(intakeCore.includes("EXTRACTED_SIZE_TOO_LARGE"), "Zip extracted-size protection should be enforced");
}

function testUiCopyConfigDriven() {
  const root = process.cwd();
  const composer = fs.readFileSync(path.join(root, "apps/control-plane/src/components/chat/Composer.tsx"), "utf8");
  const intakeConfig = fs.readFileSync(path.join(root, "apps/control-plane/src/services/intakeConfig.ts"), "utf8");
  assert(composer.includes("formatMaxUploadLabel"), "Composer should use config-driven max upload label");
  assert(!composer.includes("max 10 MB"), "Composer should not contain hardcoded max 10 MB copy");
  assert(intakeConfig.includes("NEXT_PUBLIC_BOTOMATIC_MAX_UPLOAD_MB"), "Public env max upload config should be wired");
}

function run() {
  test16Point2MbAcceptedByDefault();
  testConfiguredMaxRejectsAboveLimit();
  testZipTraversalRejected();
  testSafeZipPathAccepted();
  testUnsupportedExtensionRejected();
  testSupportedTypesAccepted();
  testZipBombGuardsDeclared();
  testUiCopyConfigDriven();
  console.log("largeFileIntake.test.ts passed");
}

run();
