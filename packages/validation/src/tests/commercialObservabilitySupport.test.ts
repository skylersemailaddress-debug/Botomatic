import assert from "node:assert";
import { AddressInfo } from "node:net";
import type express from "express";
import { InMemoryProjectRepository } from "../../../supabase-adapter/src/memoryRepo";
import type { RuntimeConfig } from "../../../../apps/orchestrator-api/src/config";
import { buildApp } from "../../../../apps/orchestrator-api/src/server_app";
import { getRecentStructuredLogs, resetObservabilityStateForTests } from "../../../../apps/orchestrator-api/src/observability";

function createRuntimeConfig(): RuntimeConfig {
  return {
    appName: "botomatic-orchestrator-api",
    runtimeMode: "development",
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
      implementation: "local_test_headers",
    },
    deploymentEnvironment: "local",
    hosted: false,
    alertWebhookUrl: null,
    intake: {
      limits: {
        maxUploadMb: 100,
        maxExtractedMb: 500,
        maxZipFiles: 1000,
        maxUploadBytes: 100 * 1024 * 1024,
        maxExtractedBytes: 500 * 1024 * 1024,
      },
      uploadDir: "/tmp/botomatic-test-uploads",
    },
  };
}

async function withServer<T>(app: express.Express, fn: (baseUrl: string) => Promise<T>): Promise<T> {
  const server = app.listen(0);
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const { port } = server.address() as AddressInfo;
  try {
    return await fn(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  }
}

const ADMIN_HEADERS = {
  "content-type": "application/json",
  "x-user-id": "admin-user",
  "x-role": "admin",
  "x-tenant-id": "tenant-alpha",
};

const OPERATOR_HEADERS = {
  "content-type": "application/json",
  "x-user-id": "operator-user",
  "x-role": "operator",
  "x-tenant-id": "tenant-alpha",
};

const REVIEWER_HEADERS = {
  "content-type": "application/json",
  "x-user-id": "reviewer-user",
  "x-role": "reviewer",
  "x-tenant-id": "tenant-alpha",
};

async function createProject(baseUrl: string): Promise<string> {
  const response = await fetch(`${baseUrl}/api/projects/intake`, {
    method: "POST",
    headers: ADMIN_HEADERS,
    body: JSON.stringify({
      name: "Commercial Observability Test Project",
      request: "Build a commercial SaaS support workflow.",
    }),
  });
  assert.strictEqual(response.status, 200, `project intake failed with ${response.status}`);
  const body = await response.json() as { projectId?: string };
  assert.ok(body.projectId, "project intake must return a projectId");
  return String(body.projectId);
}

async function run() {
  // request ID propagation
  // audit event on denied access
  // ops metrics include key counters
  // support endpoints require admin/operator role
  resetObservabilityStateForTests();
  await withServer(buildApp(createRuntimeConfig()), async (baseUrl) => {
    const projectId = await createProject(baseUrl);

    const requestId = "req-commercial-observability";
    const health = await fetch(`${baseUrl}/api/health`, { headers: { "x-request-id": requestId } });
    assert.strictEqual(health.status, 200, "/api/health should succeed");
    const requestLog = getRecentStructuredLogs().find((entry) => entry.event === "http_request" && entry.requestId === requestId);
    assert.ok(requestLog, "request ID propagation must appear in structured logs");
    assert.strictEqual(requestLog?.requestId, requestId);

    const denied = await fetch(`${baseUrl}/admin/projects/${projectId}/state`, { headers: REVIEWER_HEADERS });
    assert.strictEqual(denied.status, 403, "reviewer must be denied for admin support routes");

    const evidence = await fetch(`${baseUrl}/admin/projects/${projectId}/evidence-bundle`, { headers: ADMIN_HEADERS });
    assert.strictEqual(evidence.status, 200, "admin evidence bundle should succeed");
    const evidenceBody = await evidence.json() as { auditEvents?: Array<{ type?: string; reason?: string }> };
    assert.ok(
      evidenceBody.auditEvents?.some((event) => event.type === "access_denied" && event.reason === "insufficient_role"),
      "audit event on denied access must be written to project evidence",
    );

    const metrics = await fetch(`${baseUrl}/ops/metrics`, { headers: OPERATOR_HEADERS });
    assert.strictEqual(metrics.status, 200, "/ops/metrics should be accessible to operator");
    const metricsBody = await metrics.json() as { metrics?: Record<string, unknown> };
    assert.ok(metricsBody.metrics, "metrics payload must include a metrics object");
    assert.ok(Object.prototype.hasOwnProperty.call(metricsBody.metrics, "botomatic_request_total"), "ops metrics include key counters: request total missing");
    assert.ok(Object.prototype.hasOwnProperty.call(metricsBody.metrics, "botomatic_job_success_total"), "ops metrics include key counters: job success total missing");
    assert.ok(Object.prototype.hasOwnProperty.call(metricsBody.metrics, "botomatic_queue_depth"), "ops metrics include key counters: queue depth missing");

    const protectedRoutes: Array<{ method: "GET" | "POST"; path: string }> = [
      { method: "GET", path: `/admin/projects/${projectId}/state` },
      { method: "GET", path: "/admin/build-runs/build_run_missing" },
      { method: "GET", path: "/admin/job-queue" },
      { method: "GET", path: `/admin/readiness/${projectId}` },
      { method: "POST", path: "/admin/jobs/job_missing/replay" },
      { method: "POST", path: "/admin/build-runs/build_run_missing/cancel" },
      { method: "GET", path: `/admin/projects/${projectId}/evidence-bundle` },
    ];

    for (const route of protectedRoutes) {
      const response = await fetch(`${baseUrl}${route.path}`, {
        method: route.method,
        headers: REVIEWER_HEADERS,
        body: route.method === "POST" ? JSON.stringify({}) : undefined,
      });
      assert.ok([401, 403].includes(response.status), `support endpoints require admin/operator role: ${route.method} ${route.path} returned ${response.status}`);
    }
  });

  console.log("commercialObservabilitySupport.test.ts passed");
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
