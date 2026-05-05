import express from "express";
import { createRuntimeConfig } from "./config";
import { buildApp } from "./server_app";
import { registerStandaloneCapabilityRoutes } from "./capabilitiesStandalone";

function start() {
  const config = createRuntimeConfig();

  const app = buildApp(config);
  registerStandaloneCapabilityRoutes(app);

  console.log(
    JSON.stringify({
      event: "api_boot",
      appName: config.appName,
      runtimeMode: config.runtimeMode,
      repositoryMode: config.repository.mode,
      repositoryImplementation: config.repository.implementation,
      authEnabled: config.auth.enabled,
      authImplementation: config.auth.implementation,
      durableEnvPresent: config.durableEnvPresent,
      intakeMaxUploadMb: config.intake.limits.maxUploadMb,
      intakeMaxExtractedMb: config.intake.limits.maxExtractedMb,
      intakeMaxZipFiles: config.intake.limits.maxZipFiles,
      intakeUploadDir: config.intake.uploadDir,
      commitSha: config.commitSha,
      startupTimestamp: config.startupTimestamp,
    })
  );

  app.listen(config.port, () => {
    console.log(`API running on ${config.port}`);
  });
}

start();
