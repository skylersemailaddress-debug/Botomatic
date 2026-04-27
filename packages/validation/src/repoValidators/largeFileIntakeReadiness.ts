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
    name: "Validate-Botomatic-LargeFileIntakeReadiness",
    status: ok ? "passed" : "failed",
    summary,
    checks,
  };
}

export function validateLargeFileIntakeReadiness(root: string): RepoValidatorResult {
  const checks = [
    "apps/orchestrator-api/src/intake/largeFileIntake.ts",
    "apps/orchestrator-api/src/server_app.ts",
    "apps/orchestrator-api/src/config.ts",
    "apps/control-plane/src/components/chat/Composer.tsx",
    "apps/control-plane/src/services/intake.ts",
    "apps/control-plane/src/services/intakeConfig.ts",
    "release-evidence/runtime/large_file_intake_readiness_proof.json",
  ];

  if (!checks.every((rel) => has(root, rel))) {
    return result(false, "Large-file intake readiness files are missing.", checks);
  }

  const intakeCore = read(root, "apps/orchestrator-api/src/intake/largeFileIntake.ts");
  const server = read(root, "apps/orchestrator-api/src/server_app.ts");
  const composer = read(root, "apps/control-plane/src/components/chat/Composer.tsx");
  const intakeSvc = read(root, "apps/control-plane/src/services/intake.ts");
  const intakeConfig = read(root, "apps/control-plane/src/services/intakeConfig.ts");

  const hardcodedTenMbInPaths =
    /max 10 MB|10 \* 1024 \* 1024|10485760/.test(server) ||
    /max 10 MB|10 \* 1024 \* 1024|10485760/.test(composer);

  if (hardcodedTenMbInPaths) {
    return result(false, "Hardcoded 10 MB limit remains in production intake paths.", checks);
  }

  const hasConfigurableLimits =
    intakeCore.includes("BOTOMATIC_MAX_UPLOAD_MB") &&
    intakeCore.includes("BOTOMATIC_MAX_EXTRACTED_MB") &&
    intakeCore.includes("BOTOMATIC_MAX_ZIP_FILES") &&
    intakeCore.includes("DEFAULT_MAX_UPLOAD_MB = 250") &&
    intakeCore.includes("DEFAULT_MAX_EXTRACTED_MB = 2000") &&
    intakeCore.includes("DEFAULT_MAX_ZIP_FILES = 20000") &&
    intakeCore.includes("Math.max(100") &&
    intakeCore.includes("maxUploadBytes");

  if (!hasConfigurableLimits) {
    return result(false, "Configurable large-file limits are missing or below required thresholds.", checks);
  }

  const hasZipSafety =
    intakeCore.includes("sanitizeArchivePath") &&
    intakeCore.includes("UNSAFE_ARCHIVE_PATH") &&
    intakeCore.includes("TOO_MANY_FILES") &&
    intakeCore.includes("EXTRACTED_SIZE_TOO_LARGE") &&
    intakeCore.includes("isZipSymlink") &&
    intakeCore.includes("POTENTIAL_SECRET_DETECTED");

  if (!hasZipSafety) {
    return result(false, "Uploaded zip safety checks are incomplete.", checks);
  }

  const hasProgressEvents = [
    "upload_started",
    "upload_received",
    "validation_started",
    "archive_scan_started",
    "extraction_started",
    "extraction_progress",
    "ingestion_started",
    "ingestion_completed",
    "ingestion_failed",
  ].every((token) => server.includes(token) || intakeCore.includes(token));

  if (!hasProgressEvents) {
    return result(false, "Large-file intake progress events are missing.", checks);
  }

  const uiIsConfigDriven =
    intakeConfig.includes("NEXT_PUBLIC_BOTOMATIC_MAX_UPLOAD_MB") &&
    composer.includes("formatMaxUploadLabel") &&
    !composer.includes("max 10 MB") &&
    intakeSvc.includes("postMultipartWithProgress");

  if (!uiIsConfigDriven) {
    return result(false, "UI upload limit copy or progress wiring is not config-driven.", checks);
  }

  let proof: any;
  try {
    proof = JSON.parse(read(root, "release-evidence/runtime/large_file_intake_readiness_proof.json"));
  } catch {
    return result(false, "Large-file intake proof artifact is missing or invalid JSON.", checks);
  }

  const proofOk =
    proof?.status === "passed" &&
    Number(proof?.configuredMaxUploadMb) >= 100 &&
    Number(proof?.configuredMaxExtractedMb) >= 500 &&
    Number(proof?.configuredMaxZipFiles) >= 1000 &&
    Number(proof?.testUploadSizeMb) >= 16.2 &&
    proof?.zipTraversalProtection === true &&
    proof?.zipBombProtection === true &&
    proof?.streamingOrDiskBackedUpload === true &&
    proof?.progressEventsReady === true &&
    proof?.uiLimitNotHardcoded === true;

  if (!proofOk) {
    return result(false, "Large-file intake proof artifact is malformed or fail-closed fields are not satisfied.", checks);
  }

  return result(
    true,
    "Large-file intake readiness is validated: config-driven high limits, disk-backed upload path, safe archive checks, progress events, and proof artifact all pass.",
    checks
  );
}
