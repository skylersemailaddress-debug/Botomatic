import express from "express";
import { createRuntimeConfig } from "./config";
import { buildApp } from "./server_app";

function start() {
  const config = createRuntimeConfig();

  const app = buildApp(config);

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
      commitSha: config.commitSha,
      startupTimestamp: config.startupTimestamp,
    })
  );

  app.listen(config.port, () => {
    console.log(`API running on ${config.port}`);
  });
}

start();
