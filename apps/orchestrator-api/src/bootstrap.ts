import { createRuntimeConfig } from "./config";
import { buildApp } from "./server_app";

function validateEnv() {
  const required = ["ANTHROPIC_API_KEY"];
  const missing = required.filter(k => !process.env[k]);
  if (missing.length > 0) {
    console.error(JSON.stringify({ event: "startup_env_error", missing }));
    process.exit(1);
  }
  // Warn if executor is pointed at Claude but the runner URL is missing
  if (process.env.EXECUTOR === "claude" && !process.env.CLAUDE_EXECUTOR_URL) {
    console.warn(JSON.stringify({ event: "startup_warn", message: "EXECUTOR=claude but CLAUDE_EXECUTOR_URL not set — executor will fail at runtime" }));
  }
}

function start() {
  validateEnv();
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
