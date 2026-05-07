import assert from "assert";
import { AddressInfo } from "net";
import type express from "express";
import { InMemoryProjectRepository } from "../../../supabase-adapter/src/memoryRepo";
import type { RuntimeConfig } from "../../../../apps/orchestrator-api/src/config";
import { buildApp } from "../../../../apps/orchestrator-api/src/server_app";

function buildHostedOidcApp(): express.Express {
  const config: RuntimeConfig = {
    appName: "botomatic-orchestrator-api",
    runtimeMode: "commercial",
    port: 0,
    startupTimestamp: new Date().toISOString(),
    commitSha: null,
    durableEnvPresent: false,
    repository: {
      repo: new InMemoryProjectRepository(),
      mode: "memory",
      implementation: "InMemoryProjectRepository",
    },
    auth: {
      enabled: true,
      implementation: "oidc",
      oidc: {
        issuerUrl: "https://issuer.example.test",
        clientId: "botomatic-test-client",
      },
    },
    deploymentEnvironment: "beta",
    hosted: true,
    alertWebhookUrl: null,
    intake: {
      limits: {
        maxUploadBytes: 100 * 1024 * 1024,
        maxExtractedBytes: 500 * 1024 * 1024,
        maxZipFiles: 1000,
      },
      uploadDir: "/tmp/botomatic-test-uploads",
    },
  };

  return buildApp(config);
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
  const previousBotomaticApiToken = process.env.BOTOMATIC_API_TOKEN;
  const previousApiAuthToken = process.env.API_AUTH_TOKEN;

  const staticToken = ["operator", "static", "token", "for", "orchestrator", "test"].join("-");
  const legacyToken = ["legacy", "token", "must", "not", "authorize", "oidc", "operator", "routes"].join("-");

  process.env.BOTOMATIC_API_TOKEN = staticToken;
  process.env.API_AUTH_TOKEN = legacyToken;

  try {
    await withServer(buildHostedOidcApp(), async (baseUrl) => {
      const health = await fetch(`${baseUrl}/api/health`);
      assert.equal(health.status, 200, "/api/health must remain public");

      const ready = await fetch(`${baseUrl}/api/ready`);
      assert.equal(ready.status, 200, "/api/ready must remain public");

      const accepted = await fetch(`${baseUrl}/api/ops/metrics`, {
        headers: {
          authorization: ["Bearer", staticToken].join(" "),
          "x-role": "admin",
          "x-user-id": "beta-smoke-admin",
          "x-tenant-id": "beta-smoke-tenant",
        },
      });
      assert.equal(accepted.status, 200, "BOTOMATIC_API_TOKEN must authorize hosted operator smoke routes without JWT parsing");
      const acceptedBody = await accepted.json() as { actorId?: string; actorSource?: string; repositoryMode?: string };
      assert.equal(acceptedBody.actorId, "beta-smoke-admin");
      assert.equal(acceptedBody.actorSource, "botomatic_api_token");
      assert.equal(acceptedBody.repositoryMode, "memory");

      const rejected = await fetch(`${baseUrl}/api/ops/metrics`, {
        headers: { authorization: ["Bearer", ["random", "non", "jwt", "token"].join("-")].join(" ") },
        redirect: "manual",
      });
      assert.equal(rejected.status, 401, "Random non-JWT bearer tokens must not use the static-token bypass");
      assert.equal(rejected.headers.get("location"), null, "Invalid API bearer tokens must return JSON instead of a login redirect");
      const rejectedBody = await rejected.json() as { error?: string; policy?: string };
      assert.equal(rejectedBody.error, "Invalid OIDC token format");
      assert.equal(rejectedBody.policy, "operator");

      const legacyAliasRejected = await fetch(`${baseUrl}/api/ops/metrics`, {
        headers: { authorization: ["Bearer", legacyToken].join(" ") },
      });
      assert.equal(legacyAliasRejected.status, 401, "API_AUTH_TOKEN must not authorize OIDC operator routes as an implicit alias");
    });

    const clientApi = await import("fs").then((fs) => fs.readFileSync("apps/control-plane/src/services/api.ts", "utf8"));
    assert(!clientApi.includes("NEXT_PUBLIC_BOTOMATIC_API_TOKEN"), "Client API helpers must not expose BOTOMATIC_API_TOKEN through a NEXT_PUBLIC_ variable");
  } finally {
    if (previousBotomaticApiToken === undefined) delete process.env.BOTOMATIC_API_TOKEN;
    else process.env.BOTOMATIC_API_TOKEN = previousBotomaticApiToken;

    if (previousApiAuthToken === undefined) delete process.env.API_AUTH_TOKEN;
    else process.env.API_AUTH_TOKEN = previousApiAuthToken;
  }

  console.log("orchestratorOperatorTokenAuth.test.ts passed");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
