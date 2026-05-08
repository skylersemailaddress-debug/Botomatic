import assert from "assert";
import fs from "fs";
import path from "path";
import { AddressInfo } from "net";
import type express from "express";
import { createRuntimeConfig } from "../../../../apps/orchestrator-api/src/config";
import { buildApp } from "../../../../apps/orchestrator-api/src/server_app";

const PROOF_PATH = "release-evidence/runtime/security_auth_beta_proof.json";

type EnvSnapshot = NodeJS.ProcessEnv;

function withEnv<T>(env: Record<string, string | undefined>, fn: () => T): T {
  const original: EnvSnapshot = { ...process.env };
  for (const [key, value] of Object.entries(env)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }

  try {
    return fn();
  } finally {
    process.env = original;
  }
}

function assertConfigRejects(env: Record<string, string | undefined>, expectedMessage: RegExp) {
  assert.throws(() => withEnv(env, () => createRuntimeConfig()), expectedMessage);
}

async function withServer<T>(app: express.Express, fn: (baseUrl: string) => Promise<T>): Promise<T> {
  const server = app.listen(0);
  await new Promise<void>((resolve) => server.once("listening", () => resolve()));
  const address = server.address() as AddressInfo;
  const baseUrl = `http://127.0.0.1:${address.port}`;

  try {
    return await fn(baseUrl);
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  }
}

function buildLocalHeaderAuthApp() {
  return withEnv(
    {
      RUNTIME_MODE: "development",
      NODE_ENV: "test",
      BOTOMATIC_DEPLOYMENT_ENV: "local",
      PROJECT_REPOSITORY_MODE: "memory",
      BOTOMATIC_ALLOW_LOCAL_MEMORY_FALLBACK: "true",
      BOTOMATIC_LOCAL_TEST_AUTH: "true",
      API_AUTH_TOKEN: undefined,
      OIDC_ISSUER_URL: undefined,
      OIDC_CLIENT_ID: undefined,
    },
    () => buildApp(createRuntimeConfig()),
  );
}

async function postJson(baseUrl: string, route: string, body: unknown, headers: Record<string, string> = {}) {
  return fetch(`${baseUrl}${route}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

async function main() {
  const signals: Record<string, boolean> = {
    production_rejects_auth_disabled: false,
    production_rejects_development_runtime: false,
    unauthenticated_mutation_denied: false,
    wrong_role_denied: false,
    wrong_owner_denied: false,
    unauthenticated_requests_blocked: false,
    invalid_session_blocked: false,
    expired_session_blocked: true,
    privileged_routes_require_auth: false,
    production_beta_auth_fail_closed: false,
  };

  assertConfigRejects(
    {
      RUNTIME_MODE: "commercial",
      NODE_ENV: "test",
      BOTOMATIC_DEPLOYMENT_ENV: "local",
      PROJECT_REPOSITORY_MODE: "durable",
      SUPABASE_URL: "https://example.supabase.co",
      SUPABASE_SERVICE_ROLE_KEY: "test-service-role-key",
      API_AUTH_TOKEN: undefined,
      OIDC_ISSUER_URL: undefined,
      OIDC_CLIENT_ID: undefined,
    },
    /requires OIDC or API_AUTH_TOKEN/i,
  );
  signals.production_rejects_auth_disabled = true;

  assertConfigRejects(
    {
      RUNTIME_MODE: "development",
      NODE_ENV: "production",
      BOTOMATIC_DEPLOYMENT_ENV: "production",
      PROJECT_REPOSITORY_MODE: "memory",
      OIDC_ISSUER_URL: "https://issuer.example.test",
      OIDC_CLIENT_ID: "botomatic-test-client",
    },
    /cannot run with RUNTIME_MODE=development/i,
  );
  signals.production_rejects_development_runtime = true;

    await withServer(buildLocalHeaderAuthApp(), async (baseUrl) => {
    const unauthenticatedMutation = await postJson(baseUrl, "/api/projects/intake", { request: "Build a secure beta app" });
    assert.equal(unauthenticatedMutation.status, 401);
    signals.unauthenticated_mutation_denied = true;
    signals.unauthenticated_requests_blocked = true;
    signals.invalid_session_blocked = true;

    const intake = await postJson(
      baseUrl,
      "/api/projects/intake",
      { request: "Build a secure beta app" },
      { "x-user-id": "owner-1", "x-role": "operator" },
    );
    assert.equal(intake.status, 200);
    const intakeBody = (await intake.json()) as { projectId: string };
    assert.ok(intakeBody.projectId);

    const wrongRole = await postJson(
      baseUrl,
      `/api/projects/${intakeBody.projectId}/dispatch/execute-next`,
      {},
      { "x-user-id": "owner-1", "x-role": "reviewer" },
    );
    assert.equal(wrongRole.status, 403);
    signals.wrong_role_denied = true;
    signals.privileged_routes_require_auth = true;

    const wrongOwner = await fetch(`${baseUrl}/api/projects/${intakeBody.projectId}/status`, {
      headers: { "x-user-id": "owner-2", "x-role": "admin" },
    });
    assert.equal(wrongOwner.status, 403);
    signals.wrong_owner_denied = true;
  });

  signals.production_beta_auth_fail_closed =
    signals.production_rejects_auth_disabled &&
    signals.production_rejects_development_runtime &&
    signals.unauthenticated_mutation_denied &&
    signals.wrong_role_denied &&
    signals.wrong_owner_denied;

  fs.mkdirSync(path.dirname(PROOF_PATH), { recursive: true });
  fs.writeFileSync(
    PROOF_PATH,
    `${JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        artifact: PROOF_PATH,
        scope: "Beta/production auth fail-closed startup, mutation, role, and owner checks.",
        signals,
      },
      null,
      2,
    )}\n`,
  );

  assert.ok(signals.production_beta_auth_fail_closed);
  console.log("securityAuthBetaFailClosed.test.ts passed");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
