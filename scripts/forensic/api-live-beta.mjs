import fs from "fs/promises";
import path from "path";

const OUTPUT_DIR = path.join(process.cwd(), "receipts", "forensic-readiness");
const OUTPUT_JSON = path.join(OUTPUT_DIR, "api-live-beta.json");
const OUTPUT_MD = path.join(OUTPUT_DIR, "api-live-beta.md");

const UI_BASE_URL = process.env.BASE_URL || "http://127.0.0.1:3000";
const API_BASE_URL = process.env.API_BASE_URL || "http://127.0.0.1:3001";
const TOKEN = process.env.BOTOMATIC_API_TOKEN || process.env.NEXT_PUBLIC_BOTOMATIC_API_TOKEN || "dev-api-token";

function now() {
  return new Date().toISOString();
}

async function request(url, options = {}) {
  const startedAt = Date.now();
  try {
    const response = await fetch(url, options);
    const text = await response.text();
    let body = text;
    try {
      body = text ? JSON.parse(text) : null;
    } catch {
      // keep text
    }

    return {
      ok: response.ok,
      status: response.status,
      statusText: response.statusText,
      latencyMs: Date.now() - startedAt,
      headers: Object.fromEntries(response.headers.entries()),
      body,
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      statusText: "NETWORK_ERROR",
      latencyMs: Date.now() - startedAt,
      headers: {},
      body: { error: String(error?.message || error) },
    };
  }
}

function corsAllowed(headerValue, origin) {
  if (!headerValue) return false;
  return headerValue === origin;
}

async function main() {
  await fs.mkdir(OUTPUT_DIR, { recursive: true });

  const checks = [];

  const directHealth = await request(`${API_BASE_URL}/api/health`, {
    headers: { Authorization: `Bearer ${TOKEN}` },
  });
  checks.push({
    id: "api_health_direct",
    method: "GET",
    url: `${API_BASE_URL}/api/health`,
    auth: true,
    result: directHealth,
    pass: directHealth.status === 200 && directHealth.body && directHealth.body.status === "ok",
  });

  const proxiedHealth = await request(`${UI_BASE_URL}/api/health`, {
    headers: { Authorization: `Bearer ${TOKEN}` },
  });
  checks.push({
    id: "api_health_via_ui_proxy",
    method: "GET",
    url: `${UI_BASE_URL}/api/health`,
    auth: true,
    result: proxiedHealth,
    pass: proxiedHealth.status === 200 && proxiedHealth.body && proxiedHealth.body.status === "ok",
  });

  const corsOrigins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "https://glorious-guacamole-v69rq49vpxqx26x64-3000.app.github.dev",
  ];

  for (const origin of corsOrigins) {
    const preflight = await request(`${API_BASE_URL}/api/health`, {
      method: "OPTIONS",
      headers: {
        Origin: origin,
        "Access-Control-Request-Method": "GET",
        "Access-Control-Request-Headers": "Authorization,Content-Type",
      },
    });

    const allowOrigin = preflight.headers["access-control-allow-origin"] || "";
    checks.push({
      id: `cors_preflight_${origin}`,
      method: "OPTIONS",
      url: `${API_BASE_URL}/api/health`,
      origin,
      result: preflight,
      pass: preflight.status === 204 && corsAllowed(allowOrigin, origin),
    });
  }

  const intakePayload = {
    name: `Forensic API Probe ${Date.now()}`,
    request: "Build a CRM with clients, tasks, invoices, and dashboard.",
  };

  const intake = await request(`${API_BASE_URL}/api/projects/intake`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(intakePayload),
  });

  const projectId = intake?.body?.projectId ? String(intake.body.projectId) : null;

  checks.push({
    id: "projects_intake_direct",
    method: "POST",
    url: `${API_BASE_URL}/api/projects/intake`,
    auth: true,
    requestShape: { name: "string", request: "string" },
    responseShapeExpected: { projectId: "string" },
    result: intake,
    pass: intake.status === 200 && Boolean(projectId),
  });

  if (projectId) {
    const operatorSend = await request(`${API_BASE_URL}/api/projects/${projectId}/operator/send`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ message: "Add a pricing section and FAQ." }),
    });

    checks.push({
      id: "operator_send_direct",
      method: "POST",
      url: `${API_BASE_URL}/api/projects/${projectId}/operator/send`,
      auth: true,
      requestShape: { message: "string" },
      result: operatorSend,
      pass: operatorSend.status < 500 && operatorSend.status !== 0,
    });
  }

  const failed = checks.filter((item) => !item.pass);
  const output = {
    capturedAt: now(),
    uiBaseUrl: UI_BASE_URL,
    apiBaseUrl: API_BASE_URL,
    checkCount: checks.length,
    failedCount: failed.length,
    passed: failed.length === 0,
    checks,
  };

  await fs.writeFile(OUTPUT_JSON, JSON.stringify(output, null, 2), "utf8");

  const lines = [
    "# API Live Beta Audit",
    "",
    `- Captured at: ${output.capturedAt}`,
    `- UI base URL: ${UI_BASE_URL}`,
    `- API base URL: ${API_BASE_URL}`,
    `- Checks: ${output.checkCount}`,
    `- Failed: ${output.failedCount}`,
    "",
    "## Results",
    ...checks.map((item) => `- ${item.pass ? "PASS" : "FAIL"} ${item.id} (${item.method} ${item.url}) status=${item.result.status}`),
  ];

  await fs.writeFile(OUTPUT_MD, `${lines.join("\n")}\n`, "utf8");

  if (failed.length > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error("api-live-beta failed", error);
  process.exitCode = 1;
});
