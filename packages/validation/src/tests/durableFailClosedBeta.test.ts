import assert from "assert";
import fs from "fs";
import path from "path";
import { AddressInfo } from "net";
import type express from "express";
import { enforceDurableStorageBeforeStartup } from "../../../../apps/orchestrator-api/src/bootstrap";
import { createRuntimeConfig } from "../../../../apps/orchestrator-api/src/config";
import { buildApp } from "../../../../apps/orchestrator-api/src/server_app";

const PROOF_PATH = "release-evidence/runtime/durable_fail_closed_beta_proof.json";

type EnvSnapshot = NodeJS.ProcessEnv;

async function withEnv<T>(env: Record<string, string | undefined>, fn: () => Promise<T> | T): Promise<T> {
  const original: EnvSnapshot = { ...process.env };
  for (const [key, value] of Object.entries(env)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }

  try {
    return await fn();
  } finally {
    process.env = original;
  }
}

async function withFetch<T>(handler: typeof fetch, fn: () => Promise<T>): Promise<T> {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = handler;
  try {
    return await fn();
  } finally {
    globalThis.fetch = originalFetch;
  }
}

async function assertStartupRejects(env: Record<string, string | undefined>, expectedMessage: RegExp) {
  await assert.rejects(
    () =>
      withFetch(
        async () => new Response("storage outage", { status: 503 }),
        () => withEnv(env, () => enforceDurableStorageBeforeStartup()),
      ),
    expectedMessage,
  );
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

async function main() {
  const signals: Record<string, boolean> = {
    production_supabase_outage_blocks_startup_or_readiness: false,
    beta_does_not_fallback_to_memory: false,
    development_memory_fallback_explicit_only: false,
    public_traffic_not_accepted_without_durable_repo: false,
  };

  await assertStartupRejects(
    {
      RUNTIME_MODE: "commercial",
      BOTOMATIC_DEPLOYMENT_ENV: "production",
      PROJECT_REPOSITORY_MODE: "durable",
      QUEUE_BACKEND: "supabase",
      SUPABASE_URL: "https://example.supabase.co",
      SUPABASE_SERVICE_ROLE_KEY: "test-service-role-key",
      BOTOMATIC_ALLOW_LOCAL_MEMORY_FALLBACK: undefined,
    },
    /durable storage is required/i,
  );
  signals.production_supabase_outage_blocks_startup_or_readiness = true;

  await assertStartupRejects(
    {
      RUNTIME_MODE: "commercial",
      BOTOMATIC_DEPLOYMENT_ENV: "beta",
      PROJECT_REPOSITORY_MODE: "durable",
      QUEUE_BACKEND: "supabase",
      SUPABASE_URL: "https://example.supabase.co",
      SUPABASE_SERVICE_ROLE_KEY: "test-service-role-key",
      BOTOMATIC_ALLOW_LOCAL_MEMORY_FALLBACK: "true",
    },
    /durable storage is required/i,
  );
  signals.beta_does_not_fallback_to_memory = true;

  await assertStartupRejects(
    {
      RUNTIME_MODE: "development",
      BOTOMATIC_DEPLOYMENT_ENV: "local",
      PROJECT_REPOSITORY_MODE: "durable",
      QUEUE_BACKEND: "supabase",
      SUPABASE_URL: "https://example.supabase.co",
      SUPABASE_SERVICE_ROLE_KEY: "test-service-role-key",
      BOTOMATIC_ALLOW_LOCAL_MEMORY_FALLBACK: undefined,
    },
    /durable storage is required/i,
  );

  await withFetch(
    async () => new Response("storage outage", { status: 503 }),
    async () =>
      withEnv(
        {
          RUNTIME_MODE: "development",
          BOTOMATIC_DEPLOYMENT_ENV: "local",
          PROJECT_REPOSITORY_MODE: "durable",
          QUEUE_BACKEND: "supabase",
          SUPABASE_URL: "https://example.supabase.co",
          SUPABASE_SERVICE_ROLE_KEY: "test-service-role-key",
          BOTOMATIC_ALLOW_LOCAL_MEMORY_FALLBACK: "true",
        },
        async () => {
          await enforceDurableStorageBeforeStartup();
          assert.equal(process.env.PROJECT_REPOSITORY_MODE, "memory");
          assert.equal(process.env.QUEUE_BACKEND, "memory");
        },
      ),
  );

  await withEnv(
    {
      RUNTIME_MODE: "development",
      BOTOMATIC_DEPLOYMENT_ENV: "local",
      NODE_ENV: "test",
      PROJECT_REPOSITORY_MODE: "memory",
      BOTOMATIC_ALLOW_LOCAL_MEMORY_FALLBACK: undefined,
    },
    () => {
      assert.throws(() => createRuntimeConfig(), /BOTOMATIC_ALLOW_LOCAL_MEMORY_FALLBACK=true is required/i);
    },
  );
  signals.development_memory_fallback_explicit_only = true;

  const app = await withEnv(
    {
      RUNTIME_MODE: "development",
      BOTOMATIC_DEPLOYMENT_ENV: "local",
      NODE_ENV: "test",
      PROJECT_REPOSITORY_MODE: "memory",
      BOTOMATIC_ALLOW_LOCAL_MEMORY_FALLBACK: "true",
      BOTOMATIC_LOCAL_TEST_AUTH: "true",
      API_AUTH_TOKEN: undefined,
      OIDC_ISSUER_URL: undefined,
      OIDC_CLIENT_ID: undefined,
    },
    () => buildApp(createRuntimeConfig()),
  );

  await withServer(app, async (baseUrl) => {
    const rejected = await fetch(`${baseUrl}/api/projects/intake`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: "https://public.example.test",
        Host: "botomatic-public.example.test",
        "x-user-id": "owner-1",
        "x-role": "operator",
      },
      body: JSON.stringify({ request: "Build a public beta app" }),
    });
    assert.equal(rejected.status, 503);
    const body = (await rejected.json()) as { status?: string; repositoryMode?: string };
    assert.equal(body.status, "maintenance");
    assert.equal(body.repositoryMode, "memory");
  });
  signals.public_traffic_not_accepted_without_durable_repo = true;

  fs.mkdirSync(path.dirname(PROOF_PATH), { recursive: true });
  fs.writeFileSync(
    PROOF_PATH,
    `${JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        artifact: PROOF_PATH,
        scope: "Durable storage fail-closed behavior for beta/production and explicit local memory fallback.",
        signals,
      },
      null,
      2,
    )}\n`,
    "utf8",
  );

  assert.ok(Object.values(signals).every(Boolean));
  console.log("durableFailClosedBeta.test.ts passed");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
