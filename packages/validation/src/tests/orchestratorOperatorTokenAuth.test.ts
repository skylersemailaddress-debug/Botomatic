import assert from "assert";
import { AddressInfo } from "net";
import express from "express";
import { InMemoryProjectRepository } from "../../../supabase-adapter/src/memoryRepo";
import type { RuntimeConfig } from "../../../../apps/orchestrator-api/src/config";
import { buildApp } from "../../../../apps/orchestrator-api/src/server_app";

function buildHostedOidcApp(issuerUrl = "https://issuer.example.test"): express.Express {
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
        issuerUrl,
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
  const legacyToken = ["legacy", "api", "auth", "token", "for", "orchestrator", "test"].join("-");

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

      const legacyAliasAccepted = await fetch(`${baseUrl}/api/ops/metrics`, {
        headers: {
          authorization: ["Bearer", legacyToken].join(" "),
          "x-user-id": "legacy-smoke-admin",
          "x-tenant-id": "legacy-smoke-tenant",
        },
      });
      assert.equal(legacyAliasAccepted.status, 200, "API_AUTH_TOKEN must authorize hosted operator smoke routes as a backward-compatible alias");
      const legacyAliasBody = await legacyAliasAccepted.json() as { actorId?: string; actorSource?: string };
      assert.equal(legacyAliasBody.actorId, "legacy-smoke-admin");
      assert.equal(legacyAliasBody.actorSource, "botomatic_api_token");
    });

    await withServer(express().get("/.well-known/jwks.json", (_req, res) => res.json({ keys: [] })), async (issuerUrl) => {
      await withServer(buildHostedOidcApp(issuerUrl), async (baseUrl) => {
        const encodedHeader = Buffer.from(JSON.stringify({ alg: "RS256", kid: "missing-test-key" })).toString("base64url");
        const encodedPayload = Buffer.from(JSON.stringify({ sub: "oidc-user", iss: issuerUrl, exp: Math.floor(Date.now() / 1000) + 300 })).toString("base64url");
        const jwtLikeToken = [encodedHeader, encodedPayload, "invalid-signature"].join(".");
        const rejectedJwt = await fetch(`${baseUrl}/api/ops/metrics`, {
          headers: { authorization: ["Bearer", jwtLikeToken].join(" ") },
        });
        assert.equal(rejectedJwt.status, 401, "OIDC bearer tokens that do not match the static operator token must still require JWKS verification");
        const rejectedJwtBody = await rejectedJwt.json() as { error?: string; policy?: string };
        assert.equal(rejectedJwtBody.error, "OIDC signing key not found");
        assert.equal(rejectedJwtBody.policy, "operator");
      });
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
