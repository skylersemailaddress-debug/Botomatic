import { createRuntimeConfig } from "./config";
import { buildApp } from "./server_app";
import { spawn, ChildProcess } from "child_process";
import { resolve } from "path";

function validateEnv() {
  const required = ["ANTHROPIC_API_KEY"];
  const missing = required.filter(k => !process.env[k]);
  if (missing.length > 0) {
    console.error(JSON.stringify({ event: "startup_env_error", missing }));
    process.exit(1);
  }
}

// ── Claude Runner sidecar ─────────────────────────────────────────────────────
// Spawns apps/claude-runner as a child process so a single `npm start` boots both.
// Only spawned when EXECUTOR=claude (the real-work mode).
// Auto-restarts on crash with exponential backoff (up to 30s).

let runnerRestartDelay = 2000;
let runnerProcess: ChildProcess | null = null;

function spawnClaudeRunner() {
  if (process.env.EXECUTOR !== "claude") return;

  const runnerScript = resolve(process.cwd(), "apps/claude-runner/src/server.ts");
  const runnerPort   = parseInt(process.env.CLAUDE_EXECUTOR_URL?.split(":").pop() ?? "4000", 10);

  runnerProcess = spawn(
    "npx",
    ["tsx", "--no-warnings", runnerScript],
    {
      env: { ...process.env, PORT: String(runnerPort) },
      stdio: ["ignore", "inherit", "inherit"],
    }
  );

  console.log(JSON.stringify({
    event: "claude_runner_start",
    pid: runnerProcess.pid,
    port: runnerPort,
  }));

  runnerProcess.on("exit", (code, signal) => {
    if (signal === "SIGTERM" || signal === "SIGINT") return; // intentional shutdown
    console.error(JSON.stringify({ event: "claude_runner_exit", code, signal, restartIn: runnerRestartDelay }));
    setTimeout(() => {
      runnerRestartDelay = Math.min(runnerRestartDelay * 2, 30000);
      spawnClaudeRunner();
    }, runnerRestartDelay);
  });

  runnerProcess.on("error", (err) => {
    console.error(JSON.stringify({ event: "claude_runner_spawn_error", message: err.message }));
  });

  // Reset backoff after stable uptime
  setTimeout(() => { runnerRestartDelay = 2000; }, 30000);
}

function shutdownRunner() {
  if (runnerProcess) {
    runnerProcess.kill("SIGTERM");
    runnerProcess = null;
  }
}

process.on("SIGTERM", () => { shutdownRunner(); process.exit(0); });
process.on("SIGINT",  () => { shutdownRunner(); process.exit(0); });

function start() {
  validateEnv();

  // Boot the executor sidecar first so it's ready before builds arrive
  spawnClaudeRunner();

  const config = createRuntimeConfig();
  const app    = buildApp(config);

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
      executorMode: process.env.EXECUTOR ?? "mock",
      claudeRunnerSpawned: process.env.EXECUTOR === "claude",
    })
  );

  app.listen(config.port, () => {
    console.log(`API running on ${config.port}`);
  });
}

start();
