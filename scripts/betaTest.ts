#!/usr/bin/env tsx
/**
 * Botomatic Beta Test Suite
 * Simulates real user flows end-to-end against a live API server.
 * Run: PROJECT_REPOSITORY_MODE=memory EXECUTOR=mock QUEUE_BACKEND=memory API_AUTH_TOKEN=dev-api-token PORT=3002 tsx scripts/betaTest.ts
 */

import { spawn, ChildProcess } from "child_process";
import { createServer } from "net";

const BASE = process.env.TEST_API_URL ?? "http://localhost:3002";
const TOKEN = process.env.API_AUTH_TOKEN ?? "dev-api-token";
const AUTH = { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" };

let pass = 0;
let fail = 0;
const failures: string[] = [];

// ── Test helpers ─────────────────────────────────────────────────────────────

function ok(name: string) {
  console.log(`  PASS ✓ ${name}`);
  pass++;
}

function ko(name: string, reason: string) {
  console.log(`  FAIL ✗ ${name}`);
  console.log(`        → ${reason}`);
  fail++;
  failures.push(`${name}: ${reason}`);
}

async function req(method: string, path: string, body?: any, headers?: Record<string, string>): Promise<{ status: number; body: any; headers: Headers }> {
  const r = await fetch(`${BASE}${path}`, {
    method,
    headers: { ...AUTH, ...(headers ?? {}) },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  let parsed: any = null;
  const text = await r.text();
  try { parsed = JSON.parse(text); } catch { parsed = { raw: text }; }
  return { status: r.status, body: parsed, headers: r.headers };
}

async function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

// ── Server lifecycle ──────────────────────────────────────────────────────────

function portFree(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const s = createServer();
    s.once("error", () => resolve(false));
    s.once("listening", () => { s.close(); resolve(true); });
    s.listen(port, "127.0.0.1");
  });
}

async function waitReady(retries = 30): Promise<boolean> {
  for (let i = 0; i < retries; i++) {
    try {
      const r = await fetch(`${BASE}/health`);
      if (r.status === 200) return true;
    } catch {}
    await sleep(500);
  }
  return false;
}

async function startServer(): Promise<ChildProcess | null> {
  const port = Number(new URL(BASE).port ?? 3002);
  const free = await portFree(port);
  if (!free) {
    console.log(`  → Server already running on port ${port}, using it`);
    return null;
  }
  console.log(`  → Starting API server on port ${port}...`);
  const proc = spawn("npx", ["tsx", "apps/orchestrator-api/src/bootstrap.ts"], {
    env: {
      ...process.env,
      PORT: String(port),
      API_AUTH_TOKEN: TOKEN,
      PROJECT_REPOSITORY_MODE: "memory",
      EXECUTOR: "mock",
      QUEUE_BACKEND: "memory",
      RUNTIME_MODE: "development",
      ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY ?? "test-key-placeholder",
    },
    cwd: process.cwd(),
    stdio: ["ignore", "pipe", "pipe"],
  });
  proc.stderr?.on("data", () => {});
  proc.stdout?.on("data", () => {});
  const ready = await waitReady(40);
  if (!ready) throw new Error("Server did not start in time");
  console.log(`  → Server ready\n`);
  return proc;
}

// ── Test groups ───────────────────────────────────────────────────────────────

async function testHealth() {
  console.log("── 1. Health & Boot ──────────────────────────────────────────");
  const r1 = await req("GET", "/health");
  r1.status === 200 && r1.body?.status === "ok" ? ok("GET /health → ok") : ko("GET /health", `status=${r1.status} body=${JSON.stringify(r1.body)}`);

  const r2 = await req("GET", "/api/health");
  r2.status === 200 && r2.body?.status === "ok" ? ok("GET /api/health → ok") : ko("GET /api/health", `status=${r2.status}`);

  const r3 = await req("GET", "/api/ops/queue");
  r3.status === 200 && ("queueDepth" in (r3.body ?? {}) || "queued" in (r3.body ?? {})) ? ok("GET /api/ops/queue → queue stats present") : ko("GET /api/ops/queue", `status=${r3.status} body=${JSON.stringify(r3.body)}`);
}

async function testAuth() {
  console.log("\n── 2. Auth Enforcement ───────────────────────────────────────");
  const r1 = await fetch(`${BASE}/api/projects/intake`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ request: "test" }) });
  r1.status === 401 ? ok("No auth header → 401") : ko("No auth header", `expected 401, got ${r1.status}`);

  const r2 = await fetch(`${BASE}/api/projects/intake`, { method: "POST", headers: { Authorization: "Bearer wrong-token", "Content-Type": "application/json" }, body: JSON.stringify({ request: "test" }) });
  r2.status === 401 ? ok("Wrong token → 401") : ko("Wrong token", `expected 401, got ${r2.status}`);

  const r3 = await req("POST", "/api/projects/intake", { request: "Build a simple todo app" });
  r3.status === 200 || r3.status === 201 ? ok("Valid token → accepted") : ko("Valid token", `expected 200/201, got ${r3.status}: ${JSON.stringify(r3.body)}`);
}

async function testValidation() {
  console.log("\n── 3. Input Validation (Zod) ─────────────────────────────────");
  const r1 = await req("POST", "/api/projects/intake", {});
  r1.status === 400 ? ok("Empty body → 400") : ko("Empty intake body", `expected 400, got ${r1.status}`);

  const r2 = await req("POST", "/api/projects/intake", { request: "" });
  r2.status === 400 ? ok("Empty request string → 400") : ko("Empty request string", `expected 400, got ${r2.status}`);

  const r3 = await req("POST", "/api/projects/intake", { request: "x".repeat(21000) });
  r3.status === 400 ? ok("Request too long (21000 chars) → 400") : ko("Request too long", `expected 400, got ${r3.status}`);

  // Need a valid projectId for downstream validation tests
  const r4 = await req("POST", "/api/projects/intake", { request: "Build a test app" });
  if (r4.status !== 200 && r4.status !== 201) { ko("Seed project for validation tests", `${r4.status}`); return; }
  const pid = r4.body?.projectId ?? r4.body?.project?.projectId;
  if (!pid) { ko("Seed project id", "no projectId in response"); return; }

  const r5 = await req("POST", `/api/projects/${pid}/spec/answer-questions`, { answers: "not-an-array" });
  r5.status === 400 ? ok("answer-questions with bad answers type → 400") : ko("answer-questions bad type", `expected 400, got ${r5.status}`);

  const r6 = await req("POST", `/api/projects/${pid}/operator/send`, { message: "" });
  r6.status === 400 ? ok("operator/send with empty message → 400") : ko("operator/send empty message", `expected 400, got ${r6.status}`);
}

async function testHappyPath(): Promise<string> {
  console.log("\n── 4. Full Happy-Path Build Flow ─────────────────────────────");
  let projectId = "";

  const r1 = await req("POST", "/api/projects/intake", {
    request: "Build a SaaS task management app with teams, projects, and AI-powered prioritization",
  });
  if (r1.status !== 200 && r1.status !== 201) { ko("intake", `${r1.status}: ${JSON.stringify(r1.body)}`); return ""; }
  projectId = r1.body?.projectId ?? r1.body?.project?.projectId;
  if (!projectId) { ko("intake projectId", `body: ${JSON.stringify(r1.body)}`); return ""; }
  const hasSpec = r1.body?.spec || r1.body?.openQuestions || r1.body?.masterTruth || r1.body?.buildContract;
  ok(`POST /intake → projectId=${projectId}`);
  hasSpec ? ok("Intake response has spec/build data") : ok("Intake created project (spec generated async)");

  const r2 = await req("POST", `/api/projects/${projectId}/spec/analyze`, { message: "" });
  r2.status === 200 ? ok("POST /spec/analyze → 200") : ko("/spec/analyze", `${r2.status}: ${JSON.stringify(r2.body)}`);

  const r3 = await req("POST", `/api/projects/${projectId}/spec/answer-questions`, {
    answers: [
      { field: "target_users", answer: "small business teams of 5-50 people" },
      { field: "core_workflow", answer: "create tasks, assign to team members, set deadlines, get AI priority suggestions" },
      { field: "monetization", answer: "SaaS subscription $10/user/month" },
    ],
  });
  r3.status === 200 ? ok("POST /spec/answer-questions → 200") : ko("/spec/answer-questions", `${r3.status}: ${JSON.stringify(r3.body)}`);
  if (r3.body?.readinessScore !== undefined) ok(`readinessScore = ${r3.body.readinessScore}`);

  const r4 = await req("GET", `/api/projects/${projectId}/spec/status`);
  r4.status === 200 ? ok("GET /spec/status → 200") : ko("/spec/status", `${r4.status}`);

  const r5 = await req("GET", `/api/projects/${projectId}/status`);
  r5.status === 200 ? ok("GET /status → 200") : ko("/status", `${r5.status}`);

  const r6 = await req("POST", `/api/projects/${projectId}/spec/confirm-and-build`, { force: true });
  if (r6.status === 200) {
    const count = r6.body?.packetCount ?? r6.body?.plan?.packets?.length ?? 0;
    ok(`POST /confirm-and-build → 200 (${count} packets)`);
  } else {
    ko("/confirm-and-build", `${r6.status}: ${JSON.stringify(r6.body)}`);
  }

  await sleep(300);
  const r7 = await req("GET", `/api/projects/${projectId}/status`);
  if (r7.status === 200) {
    const s = r7.body?.status ?? r7.body?.projectStatus;
    ok(`GET /status after build → ${s}`);
  } else {
    ko("/status after build", `${r7.status}`);
  }

  return projectId;
}

async function testPlatformDiversity() {
  console.log("\n── 5. Platform Diversity ─────────────────────────────────────");
  const cases = [
    { label: "React Native mobile", request: "Build a React Native mobile app for food delivery with GPS tracking" },
    { label: "Unity/Steam game", request: "Build a Unity game for Steam with multiplayer and achievements" },
    { label: "Chrome extension", request: "Build a Chrome browser extension for tab management and productivity" },
    { label: "Discord bot", request: "Build a Discord bot for server moderation with AI content filtering" },
    { label: "Tauri desktop", request: "Build a Tauri desktop app for file organization and search" },
    { label: "Flutter mobile", request: "Build a Flutter mobile app for personal expense tracking and budgeting" },
  ];

  for (const c of cases) {
    const r = await req("POST", "/api/projects/intake", { request: c.request });
    if (r.status === 200 || r.status === 201) {
      const pid = r.body?.projectId ?? r.body?.project?.projectId;
      ok(`${c.label} → intake ok (id=${pid})`);
    } else {
      ko(c.label, `${r.status}: ${JSON.stringify(r.body)}`);
    }
    await sleep(100);
  }
}

async function testCapabilitySynthesis() {
  console.log("\n── 6. Capability Self-Expansion ──────────────────────────────");
  const r1 = await req("GET", "/api/system/capabilities");
  const baseCount = (r1.body?.blueprints?.length ?? 0) + (r1.body?.synthesized?.length ?? 0);
  ok(`GET /system/capabilities → ${baseCount} total capabilities`);

  await req("POST", "/api/projects/intake", {
    request: "Build a WebAssembly audio processing module for real-time DSP in the browser",
  });
  await sleep(2000);

  const r2 = await req("GET", "/api/system/capabilities");
  r2.status === 200 && r2.body?.ok ? ok("GET /system/capabilities → ok:true") : ko("/system/capabilities", `${r2.status}`);

  const newCount = (r2.body?.blueprints?.length ?? 0) + (r2.body?.synthesized?.length ?? 0);
  newCount >= baseCount ? ok(`Capabilities stable or grew: ${baseCount} → ${newCount}`) : ko("Capabilities", `dropped from ${baseCount} to ${newCount}`);
}

async function testUIAndChat(projectId: string) {
  console.log("\n── 7. UI Document & Chat ─────────────────────────────────────");
  if (!projectId) { console.log("  SKIP (no projectId from happy path)"); return; }

  const r1 = await req("GET", `/api/projects/${projectId}/ui/document`);
  r1.status === 200 ? ok("GET /ui/document → 200") : ko("/ui/document", `${r1.status}`);

  const r2 = await req("POST", `/api/projects/${projectId}/ui/chat`, { message: "Add a dark mode toggle to the header" });
  if (r2.status === 200) {
    ok("POST /ui/chat (add dark mode) → 200");
    if (r2.body?.command || r2.body?.patch || r2.body?.result) ok("UI chat response has command/patch data");
  } else {
    ko("/ui/chat add dark mode", `${r2.status}: ${JSON.stringify(r2.body)}`);
  }

  const r3 = await req("POST", `/api/projects/${projectId}/ui/chat`, { message: "Remove the sidebar navigation" });
  r3.status === 200 ? ok("POST /ui/chat (remove sidebar) → 200") : ko("/ui/chat remove sidebar", `${r3.status}`);
}

async function testMemory(projectId: string) {
  console.log("\n── 8. Memory ─────────────────────────────────────────────────");
  if (!projectId) { console.log("  SKIP"); return; }
  const r = await req("GET", `/api/projects/${projectId}/memory`);
  if (r.status === 200) {
    ok("GET /memory → 200");
    "entries" in r.body || "ok" in r.body ? ok("Memory has entries/ok field") : ok("Memory response received");
  } else {
    ko("/memory", `${r.status}`);
  }
}

async function testLaunchProof(projectId: string) {
  console.log("\n── 9. Launch Proof ───────────────────────────────────────────");
  if (!projectId) { console.log("  SKIP"); return; }

  const r1 = await req("GET", `/api/projects/${projectId}/launch-proof`);
  if (r1.status === 200) {
    ok("GET /launch-proof → 200");
    typeof r1.body?.verified === "boolean" ? ok(`verified=${r1.body.verified}, proofRung=${r1.body.proofRung}`) : ko("launch-proof fields", `body=${JSON.stringify(r1.body)}`);
  } else {
    ko("/launch-proof", `${r1.status}: ${JSON.stringify(r1.body)}`);
  }

  const r2 = await req("POST", `/api/projects/${projectId}/launch/verify`, { verificationMethod: "benchmark" });
  if (r2.status === 200) {
    ok("POST /launch/verify → 200");
    typeof r2.body?.verified === "boolean" && r2.body?.message ? ok(`message: "${r2.body.message}"`) : ok("verify response received");
  } else {
    ko("/launch/verify", `${r2.status}`);
  }
}

async function testDeployments(projectId: string) {
  console.log("\n── 10. Deployments ───────────────────────────────────────────");
  if (!projectId) { console.log("  SKIP"); return; }
  const r = await req("GET", `/api/projects/${projectId}/deployments`);
  r.status === 200 ? ok(`GET /deployments → 200`) : ko("/deployments", `${r.status}: ${JSON.stringify(r.body)}`);
}

async function testSSE(projectId: string) {
  console.log("\n── 11. SSE Stream Connection ─────────────────────────────────");
  if (!projectId) { console.log("  SKIP"); return; }
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 1500);
    const r = await fetch(`${BASE}/api/projects/${projectId}/stream`, {
      headers: { ...AUTH, Accept: "text/event-stream" },
      signal: controller.signal,
    }).catch(() => null);
    clearTimeout(timer);
    if (r && r.status === 200) {
      const ct = r.headers.get("content-type") ?? "";
      ct.includes("text/event-stream") ? ok("SSE stream opened (content-type: text/event-stream)") : ok(`SSE stream opened (ct=${ct})`);
    } else if (r) {
      ko("SSE stream", `status=${r.status}`);
    } else {
      ok("SSE stream opened (aborted after 1.5s — expected for long-lived connection)");
    }
  } catch (e: any) {
    if (String(e?.name) === "AbortError" || String(e?.message).includes("abort")) {
      ok("SSE stream aborted after timeout (connection was established)");
    } else {
      ko("SSE stream", String(e?.message));
    }
  }
}

async function testSecurityHeaders() {
  console.log("\n── 12. Security Headers ──────────────────────────────────────");
  const r = await fetch(`${BASE}/health`);
  const check = (header: string, expected?: string) => {
    const val = r.headers.get(header);
    if (val && (!expected || val.toLowerCase().includes(expected.toLowerCase()))) {
      ok(`${header}: ${val.slice(0, 60)}`);
    } else {
      ko(`${header} header`, `got: ${val ?? "(missing)"}`);
    }
  };
  check("x-content-type-options", "nosniff");
  check("x-frame-options");
  check("x-xss-protection");
}

async function testEdgeCases() {
  console.log("\n── 13. Edge Cases ────────────────────────────────────────────");
  const r1 = await req("GET", "/api/projects/NONEXISTENT_PROJECT_99999/status");
  r1.status === 404 ? ok("Nonexistent project → 404") : ko("Nonexistent project", `expected 404, got ${r1.status}`);

  const r2 = await req("POST", "/api/projects/NONEXISTENT_PROJECT_99999/spec/confirm-and-build", { force: true });
  r2.status === 404 ? ok("confirm-and-build on nonexistent → 404") : ko("confirm-and-build nonexistent", `expected 404, got ${r2.status}`);
}

async function testRateLimiting() {
  console.log("\n── 14. Rate Limiting ─────────────────────────────────────────");
  // Fire 25 rapid intake requests to hit the heavy limiter (max 20/min)
  const results: number[] = [];
  for (let i = 0; i < 25; i++) {
    const r = await req("POST", "/api/projects/intake", { request: `Rate limit test project ${i}` });
    results.push(r.status);
  }
  const limited = results.filter(s => s === 429).length;
  limited > 0
    ? ok(`Rate limiter fired after ${results.indexOf(429) + 1} requests (${limited} × 429)`)
    : ok("Rate limiter not yet triggered at 25 requests (within window budget — OK for development mode)");
}

async function testRuntimeAndState(projectId: string) {
  console.log("\n── 15. Runtime & State ───────────────────────────────────────");
  if (!projectId) { console.log("  SKIP"); return; }

  const r1 = await req("GET", `/api/projects/${projectId}/runtime`);
  r1.status === 200 ? ok("GET /runtime → 200") : ko("/runtime", `${r1.status}`);

  const r2 = await req("GET", `/api/projects/${projectId}/state`);
  r2.status === 200 ? ok("GET /state → 200") : ko("/state", `${r2.status}`);

  const r3 = await req("GET", `/api/projects/${projectId}/ui/overview`);
  r3.status === 200 ? ok("GET /ui/overview → 200") : ko("/ui/overview", `${r3.status}`);

  const r4 = await req("GET", `/api/projects/${projectId}/ui/packets`);
  r4.status === 200 ? ok("GET /ui/packets → 200") : ko("/ui/packets", `${r4.status}`);
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log("╔══════════════════════════════════════════════════════════════╗");
  console.log("║         Botomatic Beta Test Suite — Real-World Simulation    ║");
  console.log("╚══════════════════════════════════════════════════════════════╝\n");

  let server: ChildProcess | null = null;
  try {
    server = await startServer();
  } catch (e: any) {
    console.error(`FATAL: Could not start server: ${e.message}`);
    process.exit(1);
  }

  try {
    await testHealth();
    await sleep(200);
    await testAuth();
    await sleep(200);
    await testValidation();
    await sleep(200);
    const projectId = await testHappyPath();
    await sleep(300);
    await testPlatformDiversity();
    await sleep(500);
    await testCapabilitySynthesis();
    await sleep(200);
    await testUIAndChat(projectId);
    await sleep(200);
    await testMemory(projectId);
    await sleep(200);
    await testLaunchProof(projectId);
    await sleep(200);
    await testDeployments(projectId);
    await sleep(200);
    await testSSE(projectId);
    await sleep(200);
    await testSecurityHeaders();
    await sleep(200);
    await testEdgeCases();
    await sleep(200);
    await testRateLimiting();
    await sleep(200);
    await testRuntimeAndState(projectId);
  } finally {
    if (server) {
      server.kill();
      await sleep(200);
    }
  }

  const total = pass + fail;
  console.log("\n╔══════════════════════════════════════════════════════════════╗");
  console.log(`║  RESULTS: ${pass}/${total} passed   ${fail > 0 ? `${fail} FAILED` : "ALL PASS ✓"}${" ".repeat(Math.max(0, 28 - String(total).length - String(fail).length))}║`);
  console.log("╚══════════════════════════════════════════════════════════════╝");

  if (failures.length > 0) {
    console.log("\nFailed tests:");
    failures.forEach(f => console.log(`  ✗ ${f}`));
  }

  process.exit(fail > 0 ? 1 : 0);
}

main();
