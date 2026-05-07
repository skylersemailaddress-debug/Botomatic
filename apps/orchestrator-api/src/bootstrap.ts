import { EXPLICIT_LOCAL_MEMORY_FALLBACK_ENV, createRuntimeConfig } from "./config";
import { buildApp } from "./server_app";
import { registerStandaloneCapabilityRoutes } from "./capabilitiesStandalone";
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

// ── Supabase connectivity probe ───────────────────────────────────────────────
// Tests reachability before starting. Hosted beta/production fail closed instead
// of falling back to memory; only explicit local development can downgrade.
// Logs a clear actionable message when Supabase Network Restrictions block the IP.

export async function probeSupabase(): Promise<boolean> {
  const url   = process.env.SUPABASE_URL;
  const key   = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return false;

  try {
    const res = await fetch(`${url}/rest/v1/`, {
      method: "GET",
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(5000),
    });
    // 200 or 404 (table not found yet) both mean the API gateway responded
    if (res.status === 403) {
      const body = await res.text();
      if (body.includes("allowlist")) {
        console.error(JSON.stringify({
          event: "supabase_blocked",
          message: "Supabase Network Restrictions are blocking this IP. To fix: go to Supabase Dashboard → Project Settings → Network → Network Restrictions → clear all IPs (allow all). Then redeploy.",
          supabaseUrl: url,
        }));
        return false;
      }
    }
    return res.ok || res.status === 404;
  } catch {
    return false;
  }
}

// ── Claude Runner sidecar ─────────────────────────────────────────────────────
let runnerRestartDelay = 2000;
let runnerProcess: ChildProcess | null = null;

function spawnClaudeRunner() {
  if (process.env.EXECUTOR !== "claude") return;
  if (process.env.EXTERNAL_CLAUDE_RUNNER === "true") return;

  const runnerScript = resolve(process.cwd(), "apps/claude-runner/src/server.ts");
  const runnerPort   = parseInt(process.env.CLAUDE_EXECUTOR_URL?.split(":").pop() ?? "4000", 10);

  const isWin = process.platform === "win32";
  runnerProcess = spawn(
    isWin ? "npx.cmd" : "npx",
    ["tsx", "--no-warnings", runnerScript],
    {
      env: { ...process.env, PORT: String(runnerPort) },
      stdio: ["ignore", "inherit", "inherit"],
      shell: isWin,
    }
  );

  console.log(JSON.stringify({
    event: "claude_runner_start",
    pid: runnerProcess.pid,
    port: runnerPort,
  }));

  runnerProcess.on("exit", (code, signal) => {
    if (signal === "SIGTERM" || signal === "SIGINT") return;
    console.error(JSON.stringify({ event: "claude_runner_exit", code, signal, restartIn: runnerRestartDelay }));
    setTimeout(() => {
      runnerRestartDelay = Math.min(runnerRestartDelay * 2, 30000);
      spawnClaudeRunner();
    }, runnerRestartDelay);
  });

  runnerProcess.on("error", (err) => {
    console.error(JSON.stringify({ event: "claude_runner_spawn_error", message: err.message }));
  });

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

function isHostedOrCommercialRuntime(): boolean {
  return (
    process.env.RUNTIME_MODE === "commercial" ||
    ["production", "prod", "beta", "preview", "staging"].includes(
      String(process.env.BOTOMATIC_DEPLOYMENT_ENV || process.env.BOTOMATIC_ENV || process.env.VERCEL_ENV || process.env.NODE_ENV || "").toLowerCase(),
    )
  );
}

function canUseLocalMemoryFallback(): boolean {
  return !isHostedOrCommercialRuntime() && process.env[EXPLICIT_LOCAL_MEMORY_FALLBACK_ENV] === "true";
}

export async function enforceDurableStorageBeforeStartup(): Promise<void> {
  const wantsDurable = process.env.PROJECT_REPOSITORY_MODE === "durable";
  const wantsSupabaseQueue = process.env.QUEUE_BACKEND === "supabase";

  if (!(wantsDurable || wantsSupabaseQueue)) return;

  const supabaseReachable = await probeSupabase();
  if (supabaseReachable) {
    console.log(JSON.stringify({ event: "supabase_connected", url: process.env.SUPABASE_URL }));
    return;
  }

  if (!canUseLocalMemoryFallback()) {
    throw new Error("Supabase unreachable; durable storage is required outside explicit local development memory fallback");
  }

  if (wantsDurable) {
    process.env.PROJECT_REPOSITORY_MODE = "memory";
    console.warn(JSON.stringify({
      event: "supabase_fallback",
      message: "Supabase unreachable — explicit local development only in-memory project store. Data will NOT persist across restarts.",
    }));
  }
  if (wantsSupabaseQueue) {
    process.env.QUEUE_BACKEND = "memory";
    console.warn(JSON.stringify({
      event: "queue_fallback",
      message: "Supabase unreachable — explicit local development only in-memory job queue. Multi-worker job distribution unavailable.",
    }));
  }
}

async function start() {
  validateEnv();

  await enforceDurableStorageBeforeStartup();

  spawnClaudeRunner();

  const config = createRuntimeConfig();
  const app    = buildApp(config);
  registerStandaloneCapabilityRoutes(app);

  if (config.runtimeMode === "commercial") {
    console.log(JSON.stringify({
      event: "commercial_runtime_started",
      runtimeMode: config.runtimeMode,
      buildSource: process.env.RAILWAY_ENVIRONMENT ? "railway" : "local",
      buildVersion: process.env.npm_package_version || null,
      nodeEnv: process.env.NODE_ENV || null,
      commitSha: config.commitSha,
    }));
  }

  console.log(JSON.stringify({
    event: "express_readiness_gate_registered",
    specCompletenessEngine: true,
    expressReadinessGate: true,
    canonicalReadinessContract: true,
  }));

  console.log(JSON.stringify({
    event: "build_start_gate_registered",
    buildStartReadinessGate: true,
  }));

  console.log(JSON.stringify({
    event: "route_inventory_registered",
    opsRoutesEndpoint: "/api/ops/routes",
    readinessRoute: "/api/projects/:projectId/readiness",
    buildStartRoute: "/api/projects/:projectId/build/start",
    operatorSendRoute: "/api/projects/:projectId/operator/send",
    autonomousBuildRoute: "/api/projects/:projectId/autonomous-build/start",
  }));

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
      buildVersion: process.env.npm_package_version || null,
      buildSource: process.env.RAILWAY_ENVIRONMENT ? "railway" : "local",
      nodeEnv: process.env.NODE_ENV || null,
      durableQueueEnabled: config.repository.mode === "durable",
      tenantIsolationEnabled: config.auth.enabled,
      productionFallbackDisabled: process.env.BOTOMATIC_ALLOW_LOCAL_MEMORY_FALLBACK !== "true",
    })
  );

  app.listen(config.port, () => {
    console.log(`API running on ${config.port}`);
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  start().catch(err => {
    console.error(JSON.stringify({ event: "startup_fatal", message: String(err?.message || err) }));
    process.exit(1);
  });
}

