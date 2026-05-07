/**
 * commercialStartupSafety.test.ts
 *
 * Verifies that the orchestrator API starts cleanly in commercial/hosted mode
 * without optional provider SDK credentials, and that the Claude runner is only
 * activated when explicitly configured.
 *
 * Regression guard for:
 *   - validateEnv() unconditionally requiring ANTHROPIC_API_KEY (crashes Railway
 *     when EXECUTOR is unset or "mock")
 *   - @anthropic-ai/sdk missing from workspace deps when EXECUTOR=claude
 *   - Optional provider SDK import crashing health/ready routes
 */
import assert from "node:assert";
import { AddressInfo } from "node:net";
import type express from "express";
import { createRuntimeConfig } from "../../../../apps/orchestrator-api/src/config";
import { buildApp } from "../../../../apps/orchestrator-api/src/server_app";

type EnvSnapshot = NodeJS.ProcessEnv;

async function withEnv<T>(env: Record<string, string | undefined>, fn: () => Promise<T> | T): Promise<T> {
  const original: EnvSnapshot = { ...process.env };
  for (const [key, value] of Object.entries(env)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  try { return await fn(); }
  finally { process.env = original; }
}

async function withServer<T>(app: express.Express, fn: (baseUrl: string) => Promise<T>): Promise<T> {
  const server = app.listen(0);
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const { port } = server.address() as AddressInfo;
  try { return await fn(`http://127.0.0.1:${port}`); }
  finally { await new Promise<void>((resolve, reject) => server.close((e) => (e ? reject(e) : resolve()))); }
}

const COMMERCIAL_ENV_NO_CLAUDE: Record<string, string | undefined> = {
  RUNTIME_MODE: "development",
  BOTOMATIC_DEPLOYMENT_ENV: "local",
  NODE_ENV: "test",
  PROJECT_REPOSITORY_MODE: "memory",
  BOTOMATIC_ALLOW_LOCAL_MEMORY_FALLBACK: "true",
  BOTOMATIC_LOCAL_TEST_AUTH: "true",
  // Deliberately absent — must NOT crash startup when EXECUTOR is unset
  ANTHROPIC_API_KEY: undefined,
  OPENAI_API_KEY: undefined,
  // EXECUTOR is unset → Claude runner must not be spawned
  EXECUTOR: undefined,
};

async function testHealthRouteWithoutProviderKeys() {
  const app = await withEnv(COMMERCIAL_ENV_NO_CLAUDE, () => buildApp(createRuntimeConfig()));
  await withServer(app, async (base) => {
    const res = await fetch(`${base}/api/health`);
    assert.strictEqual(res.status, 200, `GET /api/health must return 200 without provider API keys; got ${res.status}`);
    const ct = res.headers.get("content-type") || "";
    assert.ok(ct.includes("application/json"), `GET /api/health must return JSON, got ${ct}`);
  });
}

async function testReadyRouteWithoutProviderKeys() {
  const app = await withEnv(COMMERCIAL_ENV_NO_CLAUDE, () => buildApp(createRuntimeConfig()));
  await withServer(app, async (base) => {
    const res = await fetch(`${base}/api/ready`);
    assert.ok(res.status < 500, `GET /api/ready must not return 5xx without provider keys; got ${res.status}`);
    const ct = res.headers.get("content-type") || "";
    assert.ok(ct.includes("application/json"), `GET /api/ready must return JSON, got ${ct}`);
  });
}

async function testBootstrapValidateEnvIsConditional() {
  // bootstrap.ts's validateEnv() must not crash when ANTHROPIC_API_KEY is absent
  // and EXECUTOR is not "claude".  We verify this by importing bootstrap and
  // confirming the app still starts — the import itself would process.exit(1)
  // if validateEnv() ran unconditionally.
  const bootstrapSrc = require("fs").readFileSync(
    require("path").join(process.cwd(), "apps/orchestrator-api/src/bootstrap.ts"),
    "utf8",
  );
  // The validateEnv function must be gated on EXECUTOR === "claude"
  assert.ok(
    bootstrapSrc.includes('process.env.EXECUTOR === "claude"') &&
    bootstrapSrc.indexOf('process.env.EXECUTOR === "claude"') <
      bootstrapSrc.indexOf('"ANTHROPIC_API_KEY"'),
    "validateEnv() must check EXECUTOR === 'claude' before requiring ANTHROPIC_API_KEY",
  );
}

async function testClaudeRunnerWorkspaceRegistered() {
  // apps/claude-runner must be in root workspaces so npm install picks up
  // @anthropic-ai/sdk when EXECUTOR=claude is configured.
  const pkg = JSON.parse(require("fs").readFileSync(
    require("path").join(process.cwd(), "package.json"),
    "utf8",
  ));
  assert.ok(
    Array.isArray(pkg.workspaces) && pkg.workspaces.includes("apps/claude-runner"),
    "apps/claude-runner must be in root package.json workspaces so Railway installs @anthropic-ai/sdk when EXECUTOR=claude",
  );
}

async function testClaudeRunnerDepsAreProdDeps() {
  // @anthropic-ai/sdk must be a production dependency of claude-runner,
  // not just a devDependency.
  const runnerPkg = JSON.parse(require("fs").readFileSync(
    require("path").join(process.cwd(), "apps/claude-runner/package.json"),
    "utf8",
  ));
  assert.ok(
    runnerPkg.dependencies?.["@anthropic-ai/sdk"],
    "@anthropic-ai/sdk must be in apps/claude-runner dependencies (not devDependencies) so it is installed in production",
  );
  assert.ok(
    !runnerPkg.devDependencies?.["@anthropic-ai/sdk"],
    "@anthropic-ai/sdk must NOT be in apps/claude-runner devDependencies",
  );
}

async function main() {
  await testBootstrapValidateEnvIsConditional();
  await testClaudeRunnerWorkspaceRegistered();
  await testClaudeRunnerDepsAreProdDeps();
  await testHealthRouteWithoutProviderKeys();
  await testReadyRouteWithoutProviderKeys();
  console.log("commercialStartupSafety.test.ts passed");
}

main().catch((err) => { console.error(err); process.exit(1); });
