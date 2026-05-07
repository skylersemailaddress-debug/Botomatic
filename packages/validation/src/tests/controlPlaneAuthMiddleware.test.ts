import assert from "assert";
import { NextRequest } from "next/server";
import { middleware } from "../../../../apps/control-plane/src/middleware";

function request(path: string, init: RequestInit = {}) {
  return new NextRequest(`https://botomatic.example${path}`, init);
}

function assertNext(response: Response, message: string) {
  assert.strictEqual(response.status, 200, message);
  assert.strictEqual(response.headers.get("x-middleware-next"), "1", message);
}

async function assertJsonUnauthorized(response: Response, message: string) {
  assert.strictEqual(response.status, 401, message);
  assert.strictEqual(response.headers.get("location"), null, message);
  const body = await response.json();
  assert.deepStrictEqual(body, { error: "Unauthorized" }, message);
}

async function run() {
  const previousUiPassword = process.env.BOTOMATIC_UI_PASSWORD;
  const previousApiToken = process.env.BOTOMATIC_API_TOKEN;
  const previousApiAuthToken = process.env.API_AUTH_TOKEN;

  process.env.BOTOMATIC_UI_PASSWORD = "ui-password-for-middleware-test";
  process.env.BOTOMATIC_API_TOKEN = "api-credential-for-middleware-test";
  delete process.env.API_AUTH_TOKEN;

  try {
    assertNext(await middleware(request("/api/health")), "/api/health must be public and must not redirect to login");
    assertNext(await middleware(request("/api/ready")), "/api/ready must be public and must not redirect to login");
    assertNext(await middleware(request("/health")), "/health must remain public");
    assertNext(await middleware(request("/ready")), "/ready must remain public");

    await assertJsonUnauthorized(
      await middleware(request("/api/ops/metrics")),
      "Protected API routes without auth must return JSON 401 instead of redirecting to login",
    );

    await assertJsonUnauthorized(
      await middleware(request("/api/ops/metrics", { headers: { authorization: ["Bearer", "wrong-credential"].join(" ") } })),
      "Protected API routes with invalid bearer auth must return JSON 401 instead of redirecting to login",
    );

    assertNext(
      await middleware(request("/api/ops/metrics", { headers: { authorization: ["Bearer", "api-credential-for-middleware-test"].join(" ") } })),
      "/api/ops/metrics must accept BOTOMATIC_API_TOKEN bearer auth through the hosted middleware gate",
    );

    const pageResponse = await middleware(request("/projects"));
    assert.strictEqual(pageResponse.status, 307, "Unauthenticated browser page routes may redirect to login");
    assert.strictEqual(
      pageResponse.headers.get("location"),
      "https://botomatic.example/login?next=%2Fprojects",
      "Unauthenticated browser page routes must preserve the login redirect behavior",
    );
  } finally {
    if (previousUiPassword === undefined) delete process.env.BOTOMATIC_UI_PASSWORD;
    else process.env.BOTOMATIC_UI_PASSWORD = previousUiPassword;

    if (previousApiToken === undefined) delete process.env.BOTOMATIC_API_TOKEN;
    else process.env.BOTOMATIC_API_TOKEN = previousApiToken;

    if (previousApiAuthToken === undefined) delete process.env.API_AUTH_TOKEN;
    else process.env.API_AUTH_TOKEN = previousApiAuthToken;
  }

  console.log("controlPlaneAuthMiddleware.test.ts passed");
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
