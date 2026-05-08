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
  resetObservabilityStateForTests();

  await withServer(buildApp(createRuntimeConfig()), async (baseUrl) => {
    const projectId = await createProject(baseUrl);

    // ── Group 1: Request ID propagation + all required log field shapes ─────────
    {
      const requestId = "req-commercial-observability";
      const health = await fetch(`${baseUrl}/api/health`, { headers: { "x-request-id": requestId, ...ADMIN_HEADERS } });
      assert.strictEqual(health.status, 200, "Group 1: /api/health should succeed");

      const requestLog = getRecentStructuredLogs().find((entry) => entry.event === "http_request" && entry.requestId === requestId);
      assert.ok(requestLog, "Group 1: request ID propagation must appear in structured logs");
      assert.strictEqual(requestLog?.requestId, requestId, "Group 1: requestId must match the sent x-request-id header");
      assert.ok(typeof requestLog?.actorId === "string" && requestLog.actorId.length > 0 && requestLog.actorId !== "unknown", `Group 1: actorId must be a non-empty, non-'unknown' string, got: ${requestLog?.actorId}`);
      assert.ok(Object.prototype.hasOwnProperty.call(requestLog, "tenantId"), "Group 1: tenantId field must exist on log object");
      assert.ok(["success", "error", "rejected"].includes(String(requestLog?.outcome)), `Group 1: outcome must be success|error|rejected, got: ${requestLog?.outcome}`);
      assert.ok(Object.prototype.hasOwnProperty.call(requestLog, "errorCategory"), "Group 1: errorCategory field must exist on log object");
      assert.ok(typeof requestLog?.route === "string" && requestLog.route.length > 0, `Group 1: route must be a non-null string, got: ${requestLog?.route}`);
      assert.ok(typeof requestLog?.latency === "number" && requestLog.latency >= 0, `Group 1: latency must be a non-negative number, got: ${requestLog?.latency}`);
    }

    // ── Group 2: Audit event on denied access — project-scoped route ─────────────
    {
      const denied = await fetch(`${baseUrl}/admin/projects/${projectId}/state`, { headers: REVIEWER_HEADERS });
      assert.strictEqual(denied.status, 403, "Group 2: reviewer must be denied for admin support routes");

      const evidence = await fetch(`${baseUrl}/admin/projects/${projectId}/evidence-bundle`, { headers: ADMIN_HEADERS });
      assert.strictEqual(evidence.status, 200, "Group 2: admin evidence bundle should succeed");
      const evidenceBody = await evidence.json() as { auditEvents?: Array<{ type?: string; reason?: string }> };
      assert.ok(
        evidenceBody.auditEvents?.some((event) => event.type === "access_denied" && (event.reason === "insufficient_role" || event.reason === "route_policy_denied")),
        "Group 2: audit event on denied access must be written to project evidence with type=access_denied",
      );
    }

    // ── Group 3: Audit event on denied access — global route (non-project-scoped) ─
    {
      const deniedGlobal = await fetch(`${baseUrl}/admin/job-queue`, { headers: REVIEWER_HEADERS });
      assert.ok([401, 403].includes(deniedGlobal.status), `Group 3: reviewer must be denied on /admin/job-queue, got ${deniedGlobal.status}`);

      const evidence = await fetch(`${baseUrl}/admin/projects/${projectId}/evidence-bundle`, { headers: ADMIN_HEADERS });
      assert.strictEqual(evidence.status, 200, "Group 3: admin evidence bundle should succeed");
      const evidenceBody = await evidence.json() as { globalAuditEvents?: Array<{ type?: string }> };
      assert.ok(Array.isArray(evidenceBody.globalAuditEvents), "Group 3: evidence bundle must contain a globalAuditEvents array");
      assert.ok(
        evidenceBody.globalAuditEvents!.some((event) => event.type === "access_denied"),
        "Group 3: globalAuditEvents must include at least one access_denied entry for global-route denial",
      );
    }

    // ── Group 4: Unauthenticated access is rejected on all admin routes ───────────
    {
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
          headers: { "content-type": "application/json" },
          body: route.method === "POST" ? JSON.stringify({}) : undefined,
        });
        assert.strictEqual(response.status, 401, `Group 4: unauthenticated request to ${route.method} ${route.path} must return 401, got ${response.status}`);
      }
    }

    // ── Group 5: Operator and admin CAN access admin routes (success paths) ──────
    {
      const protectedRoutes: Array<{ method: "GET" | "POST"; path: string; headers: Record<string, string> }> = [
        { method: "GET", path: `/admin/projects/${projectId}/state`, headers: OPERATOR_HEADERS },
        { method: "GET", path: "/admin/build-runs/build_run_missing", headers: OPERATOR_HEADERS },
        { method: "GET", path: "/admin/job-queue", headers: OPERATOR_HEADERS },
        { method: "GET", path: `/admin/readiness/${projectId}`, headers: OPERATOR_HEADERS },
        { method: "POST", path: "/admin/jobs/job_missing/replay", headers: ADMIN_HEADERS },
        { method: "POST", path: "/admin/build-runs/build_run_missing/cancel", headers: ADMIN_HEADERS },
        { method: "GET", path: `/admin/projects/${projectId}/evidence-bundle`, headers: OPERATOR_HEADERS },
      ];

      for (const route of protectedRoutes) {
        const response = await fetch(`${baseUrl}${route.path}`, {
          method: route.method,
          headers: route.headers,
          body: route.method === "POST" ? JSON.stringify({}) : undefined,
        });
        assert.ok(![401, 403].includes(response.status), `Group 5: ${route.method} ${route.path} must not return auth failure for operator/admin, got ${response.status}`);
      }
    }

    // ── Group 6: /ops/metrics RBAC — reviewer is denied, operator is allowed ─────
    {
      const reviewerOps = await fetch(`${baseUrl}/ops/metrics`, { headers: REVIEWER_HEADERS });
      assert.ok([401, 403].includes(reviewerOps.status), `Group 6: reviewer must be denied on /ops/metrics, got ${reviewerOps.status}`);

      const operatorOps = await fetch(`${baseUrl}/ops/metrics`, { headers: OPERATOR_HEADERS });
      assert.strictEqual(operatorOps.status, 200, `Group 6: operator must be allowed on /ops/metrics`);

      const operatorApiOps = await fetch(`${baseUrl}/api/ops/metrics`, { headers: OPERATOR_HEADERS });
      assert.strictEqual(operatorApiOps.status, 200, `Group 6: operator must be allowed on /api/ops/metrics`);
    }

    // ── Group 7: Ops metrics actually increment after requests ────────────────────
    {
      // Make a health and readiness request to generate counter values
      await fetch(`${baseUrl}/api/health`, { headers: ADMIN_HEADERS });
      await fetch(`${baseUrl}/api/ready`, { headers: ADMIN_HEADERS });
      await fetch(`${baseUrl}/api/projects/${projectId}/readiness`, { headers: ADMIN_HEADERS });

      const metricsResponse = await fetch(`${baseUrl}/ops/metrics`, { headers: OPERATOR_HEADERS });
      assert.strictEqual(metricsResponse.status, 200, "Group 7: /ops/metrics should be accessible to operator");
      const metricsBody = await metricsResponse.json() as { metrics?: Record<string, unknown> };
      assert.ok(metricsBody.metrics, "Group 7: metrics payload must include a metrics object");

      const requestTotals = metricsBody.metrics!["botomatic_request_total"] as Array<{ value?: number }> | undefined;
      assert.ok(Array.isArray(requestTotals), "Group 7: botomatic_request_total must be present as an array");
      const totalRequests = (requestTotals || []).reduce((sum, entry) => sum + Number(entry?.value || 0), 0);
      assert.ok(totalRequests > 0, `Group 7: botomatic_request_total must have value > 0 after requests, got ${totalRequests}`);

      const hasReadinessSeries =
        Number(metricsBody.metrics!["botomatic_readiness_locked_total"] ?? 0) > 0 ||
        Number(metricsBody.metrics!["botomatic_readiness_unlocked_total"] ?? 0) > 0;
      assert.ok(hasReadinessSeries, "Group 7: botomatic_readiness_locked_total or botomatic_readiness_unlocked_total must be > 0 after readiness check");

      assert.ok(Object.prototype.hasOwnProperty.call(metricsBody.metrics, "botomatic_error_rate"), "Group 7: botomatic_error_rate must be present in metrics");
      assert.ok(typeof metricsBody.metrics!["botomatic_error_rate"] === "number", "Group 7: botomatic_error_rate must be a number");
    }

    // ── Group 8: Text/plain metrics format ────────────────────────────────────────
    {
      const textMetrics = await fetch(`${baseUrl}/ops/metrics`, {
        headers: { ...OPERATOR_HEADERS, accept: "text/plain" },
      });
      assert.strictEqual(textMetrics.status, 200, "Group 8: /ops/metrics with text/plain should succeed");
      const contentType = textMetrics.headers.get("content-type") || "";
      assert.ok(contentType.includes("text/plain"), `Group 8: Content-Type must include text/plain, got: ${contentType}`);
      const body = await textMetrics.text();
      assert.ok(body.length > 0, "Group 8: text/plain response body must be non-empty");
      assert.ok(body.includes("# TYPE botomatic_request_total"), `Group 8: text/plain body must contain '# TYPE botomatic_request_total', got: ${body.slice(0, 200)}`);
    }

    // ── Group 9: Idempotency key round-trip on admin replay ───────────────────────
    {
      // Test that replay of a non-existent job returns 404
      const idempotencyKey = `idem-key-${Date.now()}`;
      const firstReplay = await fetch(`${baseUrl}/admin/jobs/non_existent_job/replay`, {
        method: "POST",
        headers: { ...ADMIN_HEADERS, "idempotency-key": idempotencyKey },
        body: JSON.stringify({}),
      });
      assert.strictEqual(firstReplay.status, 404, "Group 9: replay of non-existent job must return 404");

      // Test idempotency: cancel a non-existent build run twice with same key
      const cancelKey = `cancel-idem-${Date.now()}`;
      const firstCancel = await fetch(`${baseUrl}/admin/build-runs/missing_build_run/cancel`, {
        method: "POST",
        headers: { ...ADMIN_HEADERS, "idempotency-key": cancelKey },
        body: JSON.stringify({}),
      });
      const secondCancel = await fetch(`${baseUrl}/admin/build-runs/missing_build_run/cancel`, {
        method: "POST",
        headers: { ...ADMIN_HEADERS, "idempotency-key": cancelKey },
        body: JSON.stringify({}),
      });
      assert.strictEqual(firstCancel.status, secondCancel.status, `Group 9: idempotent cancel must return same status code on second call (first: ${firstCancel.status}, second: ${secondCancel.status})`);
    }

    // Legacy assertions for backward compatibility
    {
      const requestId = "req-commercial-observability-legacy";
      const health = await fetch(`${baseUrl}/api/health`, { headers: { "x-request-id": requestId, ...ADMIN_HEADERS } });
      assert.strictEqual(health.status, 200, "/api/health should succeed");
      const requestLog = getRecentStructuredLogs().find((entry) => entry.event === "http_request" && entry.requestId === requestId);
      assert.ok(requestLog, "request ID propagation must appear in structured logs");
      assert.strictEqual(requestLog?.requestId, requestId);

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
    }
  });

  console.log("commercialObservabilitySupport.test.ts passed");
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});

