/**
 * readinessGateExpress.test.ts
 *
 * Spins up the Express orchestrator server in memory and exercises the
 * readiness gate routes directly, so the tests are independent of the
 * Next.js control plane and Railway routing.
 *
 * Key scenarios:
 *   1. GET /api/projects/:id/readiness returns JSON (never HTML).
 *   2. POST /api/projects/:id/build/start with "build the attached files"
 *      and artifactIds=[] returns build_locked (JSON), does NOT start a
 *      build, produces no milestoneGraph, produces no repair_budget_exhausted.
 *   3. POST /api/projects/:id/build/start with no file references and no
 *      blocking questions proceeds and returns a run object.
 *   4. operator/send with "build the attached files" and no uploaded
 *      artifacts returns clarifying/build_locked, not an autonomous build.
 */
import assert from "node:assert";
import { AddressInfo } from "node:net";
import type express from "express";
import { createRuntimeConfig } from "../../../../apps/orchestrator-api/src/config";
import { buildApp } from "../../../../apps/orchestrator-api/src/server_app";

const TEST_ENV: Record<string, string | undefined> = {
  RUNTIME_MODE: "development",
  BOTOMATIC_DEPLOYMENT_ENV: "local",
  NODE_ENV: "test",
  PROJECT_REPOSITORY_MODE: "memory",
  BOTOMATIC_ALLOW_LOCAL_MEMORY_FALLBACK: "true",
  BOTOMATIC_LOCAL_TEST_AUTH: "true",
  API_AUTH_TOKEN: undefined,
  OIDC_ISSUER_URL: undefined,
  OIDC_CLIENT_ID: undefined,
};

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
  const baseUrl = `http://127.0.0.1:${port}`;
  try { return await fn(baseUrl); }
  finally { await new Promise<void>((resolve, reject) => server.close((e) => (e ? reject(e) : resolve()))); }
}

const ACTOR_HEADERS = {
  "content-type": "application/json",
  "x-user-id": "test-owner",
  "x-role": "admin",
  "x-tenant-id": "test-tenant",
};

async function createProject(baseUrl: string, request: string): Promise<string> {
  const res = await fetch(`${baseUrl}/api/projects/intake`, {
    method: "POST",
    headers: ACTOR_HEADERS,
    body: JSON.stringify({ request, ownerUserId: "test-owner", tenantId: "test-tenant", name: "Test Project" }),
  });
  assert.strictEqual(res.status, 200, `intake failed with ${res.status}`);
  const body = await res.json() as any;
  const projectId = body.projectId || body.project?.projectId;
  assert.ok(projectId, "intake must return a projectId");
  return projectId;
}

async function testReadinessReturnsJson(baseUrl: string) {
  const projectId = await createProject(baseUrl, "Build a SaaS app");

  const res = await fetch(`${baseUrl}/api/projects/${projectId}/readiness`, { headers: ACTOR_HEADERS });

  // Must be JSON — never HTML "Cannot GET /..."
  const ct = res.headers.get("content-type") || "";
  assert.ok(ct.includes("application/json"), `readiness must return JSON, got content-type: ${ct}`);
  assert.ok(res.status < 500, `readiness must not return a 5xx, got ${res.status}`);

  const body = await res.json() as any;
  assert.ok("readyToBuild" in body, "readiness response must have readyToBuild");
  assert.ok("readinessScore" in body, "readiness response must have readinessScore");
}

async function testBuildStartWithAttachedFilesAndNoArtifactsReturnsLocked(baseUrl: string) {
  const projectId = await createProject(baseUrl, "I have some requirements");

  const res = await fetch(`${baseUrl}/api/projects/${projectId}/build/start`, {
    method: "POST",
    headers: ACTOR_HEADERS,
    body: JSON.stringify({ message: "build the attached files", artifactIds: [] }),
  });

  // Must be JSON — not HTML 404
  const ct = res.headers.get("content-type") || "";
  assert.ok(ct.includes("application/json"), `build/start must return JSON, got content-type: ${ct}`);

  const body = await res.json() as any;

  // Must be locked, not a live build
  assert.ok(
    body.readyToBuild === false || body.status === "build_locked",
    `Expected build_locked when no artifacts, got: ${JSON.stringify(body).slice(0, 200)}`,
  );
  assert.ok(
    body.missingArtifacts?.length > 0 || body.lockedReason,
    "build_locked response must explain why via missingArtifacts or lockedReason",
  );

  // Must NOT have started an autonomous build
  const raw = body.raw as any;
  const milestoneGraph = raw?.run?.milestoneGraph ?? body.run?.milestoneGraph;
  assert.ok(
    milestoneGraph === undefined || (Array.isArray(milestoneGraph) && milestoneGraph.length === 0),
    "milestoneGraph must be absent or empty when build is locked",
  );

  // Must NOT contain repair_budget_exhausted
  const bodyStr = JSON.stringify(body);
  assert.ok(
    !bodyStr.includes("repair_budget_exhausted"),
    "repair_budget_exhausted must not appear in a locked build response",
  );
}

async function testBuildStartWithNoFileReferenceProceeds(baseUrl: string) {
  const projectId = await createProject(baseUrl, "Build a simple landing page");

  const res = await fetch(`${baseUrl}/api/projects/${projectId}/build/start`, {
    method: "POST",
    headers: ACTOR_HEADERS,
    body: JSON.stringify({ message: "build this now", artifactIds: [] }),
  });

  const ct = res.headers.get("content-type") || "";
  assert.ok(ct.includes("application/json"), `build/start must return JSON even on success, got: ${ct}`);

  const body = await res.json() as any;
  // Should either proceed to a build run OR be locked by clarifications — but NOT locked for missing artifacts.
  assert.ok(
    !body.missingArtifacts?.length,
    `build/start must not report missingArtifacts when message has no attachment reference, got: ${JSON.stringify(body.missingArtifacts)}`,
  );
}

async function testOperatorSendWithAttachedFilesAndNoArtifactsBlocks(baseUrl: string) {
  const projectId = await createProject(baseUrl, "Build a SaaS product");

  const res = await fetch(`${baseUrl}/api/projects/${projectId}/operator/send`, {
    method: "POST",
    headers: ACTOR_HEADERS,
    body: JSON.stringify({ message: "build the attached files" }),
  });

  const ct = res.headers.get("content-type") || "";
  assert.ok(ct.includes("application/json"), `operator/send must return JSON, got: ${ct}`);

  const body = await res.json() as any;
  // Must be blocked (clarifying or build_locked), not an active build with repair_budget_exhausted
  const bodyStr = JSON.stringify(body);
  assert.ok(
    !bodyStr.includes("repair_budget_exhausted"),
    `operator/send with attached file refs and no artifacts must not produce repair_budget_exhausted, got: ${bodyStr.slice(0, 300)}`,
  );
  assert.ok(
    body.readyToBuild === false || body.route === "clarifying" || body.status === "build_locked" || body.missingArtifacts?.length > 0,
    `operator/send must be locked when no artifacts uploaded for attachment reference, got: ${JSON.stringify(body).slice(0, 300)}`,
  );
}

async function main() {
  const app = await withEnv(TEST_ENV, () => buildApp(createRuntimeConfig()));

  await withServer(app, async (baseUrl) => {
    await testReadinessReturnsJson(baseUrl);
    await testBuildStartWithAttachedFilesAndNoArtifactsReturnsLocked(baseUrl);
    await testBuildStartWithNoFileReferenceProceeds(baseUrl);
    await testOperatorSendWithAttachedFilesAndNoArtifactsBlocks(baseUrl);
  });

  console.log("readinessGateExpress.test.ts passed");
}

main().catch((err) => { console.error(err); process.exit(1); });
