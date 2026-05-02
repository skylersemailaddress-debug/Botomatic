import fs from "fs/promises";
import path from "path";
import { chromium } from "@playwright/test";

const OUTPUT_DIR = path.join(process.cwd(), "receipts", "forensic-readiness");
const OUTPUT_JSON = path.join(OUTPUT_DIR, "ui-actions.json");
const OUTPUT_MD = path.join(OUTPUT_DIR, "ui-actions.md");

const BASE_URL = process.env.BASE_URL || "http://127.0.0.1:3000";
const API_BASE_URL = process.env.API_BASE_URL || "http://127.0.0.1:3001";
const TOKEN = process.env.BOTOMATIC_API_TOKEN || process.env.NEXT_PUBLIC_BOTOMATIC_API_TOKEN || "dev-api-token";

function now() {
  return new Date().toISOString();
}

async function request(url, options = {}) {
  const response = await fetch(url, options);
  const text = await response.text();
  let body = text;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    // keep text
  }
  return { status: response.status, body };
}

async function createProject() {
  const intake = await request(`${API_BASE_URL}/api/projects/intake`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: `Forensic UI Actions ${Date.now()}`,
      request: "Build a SaaS dashboard with onboarding, billing, analytics, and settings.",
    }),
  });

  if (intake.status !== 200 || !intake.body?.projectId) {
    throw new Error(`Unable to create project: status=${intake.status}`);
  }

  return String(intake.body.projectId);
}

async function collectAction(page, spec) {
  const { pageName, actionName, locatorFactory, type } = spec;
  const locator = locatorFactory(page);
  const count = await locator.count();
  if (count === 0) {
    return {
      page: pageName,
      action: actionName,
      type,
      present: false,
      enabled: false,
      result: "missing",
      consoleErrors: [],
      failedRequests: [],
    };
  }

  const first = locator.first();
  const enabled = await first.isEnabled();
  const beforeUrl = page.url();
  const consoleErrors = [];
  const failedRequests = [];
  const responses = [];

  const onConsole = (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  };
  const onRequestFailed = (request) => {
    failedRequests.push(`${request.method()} ${request.url()} :: ${request.failure()?.errorText || "unknown"}`);
  };
  const onResponse = (response) => {
    const url = response.url();
    if (url.includes("/api/")) {
      responses.push({ method: response.request().method(), url, status: response.status() });
    }
  };

  page.on("console", onConsole);
  page.on("requestfailed", onRequestFailed);
  page.on("response", onResponse);

  let result = "not_attempted";

  try {
    if (!enabled) {
      result = "honest_unavailable";
    } else {
      if (type === "input-submit") {
        await first.fill("Build a support portal with tickets, knowledge base, and SLA dashboard.");
        await first.press("Enter");
        result = "submitted";
      } else {
        await first.click({ timeout: 5000 });
        result = "clicked";
      }
    }
  } catch (error) {
    result = `error:${String(error?.message || error)}`;
  }

  await page.waitForTimeout(600);

  page.off("console", onConsole);
  page.off("requestfailed", onRequestFailed);
  page.off("response", onResponse);

  const afterUrl = page.url();
  const hadApiCall = responses.some((resp) => resp.url.includes("/api/"));
  const hadNav = beforeUrl !== afterUrl;
  const actionable = enabled && (hadApiCall || hadNav || result === "clicked" || result === "submitted");

  return {
    page: pageName,
    action: actionName,
    type,
    present: true,
    enabled,
    result,
    beforeUrl,
    afterUrl,
    hadNavigation: hadNav,
    apiResponses: responses,
    consoleErrors,
    failedRequests,
    actionable,
  };
}

async function main() {
  await fs.mkdir(OUTPUT_DIR, { recursive: true });

  const projectId = await createProject();

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  const controlResults = [];

  await page.goto(`${BASE_URL}/projects/${projectId}/vibe`, { waitUntil: "domcontentloaded" });

  const vibeControls = [
    { pageName: "vibe", actionName: "Desktop", type: "button", locatorFactory: (p) => p.getByRole("button", { name: "Desktop", exact: true }) },
    { pageName: "vibe", actionName: "Tablet", type: "button", locatorFactory: (p) => p.getByRole("button", { name: "Tablet", exact: true }) },
    { pageName: "vibe", actionName: "Mobile", type: "button", locatorFactory: (p) => p.getByRole("button", { name: "Mobile", exact: true }) },
    { pageName: "vibe", actionName: "Share", type: "button", locatorFactory: (p) => p.getByRole("button", { name: "Share" }) },
    { pageName: "vibe", actionName: "Vibe Prompt", type: "input-submit", locatorFactory: (p) => p.getByLabel("Vibe prompt") },
    { pageName: "vibe", actionName: "Improve Design", type: "button", locatorFactory: (p) => p.getByRole("button", { name: "Improve Design" }) },
    { pageName: "vibe", actionName: "Add Page", type: "button", locatorFactory: (p) => p.getByRole("button", { name: "Add Page" }) },
    { pageName: "vibe", actionName: "Add Feature", type: "button", locatorFactory: (p) => p.getByRole("button", { name: "Add Feature" }) },
    { pageName: "vibe", actionName: "Connect Payments", type: "button", locatorFactory: (p) => p.getByRole("button", { name: "Connect Payments" }) },
    { pageName: "vibe", actionName: "Run Tests", type: "button", locatorFactory: (p) => p.getByRole("button", { name: "Run Tests" }) },
  ];

  for (const spec of vibeControls) {
    controlResults.push(await collectAction(page, spec));
  }

  await page.goto(`${BASE_URL}/projects/${projectId}/advanced`, { waitUntil: "domcontentloaded" });

  const proControls = [
    { pageName: "advanced", actionName: "Run", type: "button", locatorFactory: (p) => p.getByRole("button", { name: "Run", exact: true }) },
    { pageName: "advanced", actionName: "Launch", type: "button", locatorFactory: (p) => p.getByRole("button", { name: "Launch", exact: true }) },
    { pageName: "advanced", actionName: "Deploy", type: "button", locatorFactory: (p) => p.getByRole("button", { name: "Deploy", exact: true }) },
    { pageName: "advanced", actionName: "Open Preview", type: "button", locatorFactory: (p) => p.getByRole("button", { name: "Open Preview" }) },
    { pageName: "advanced", actionName: "AI Copilot Send", type: "button", locatorFactory: (p) => p.getByRole("button", { name: "Send" }).last() },
    { pageName: "advanced", actionName: "Quick Actions", type: "button", locatorFactory: (p) => p.getByRole("button", { name: "Quick Actions" }) },
  ];

  for (const spec of proControls) {
    controlResults.push(await collectAction(page, spec));
  }

  await context.close();
  await browser.close();

  const failed = controlResults.filter((item) => {
    if (!item.present) return true;
    if (item.enabled && !item.actionable) return true;
    if (item.consoleErrors.length > 0) return true;
    if (item.failedRequests.length > 0) return true;
    return false;
  });

  const output = {
    capturedAt: now(),
    baseUrl: BASE_URL,
    apiBaseUrl: API_BASE_URL,
    projectId,
    controlCount: controlResults.length,
    failedCount: failed.length,
    pass: failed.length === 0,
    controls: controlResults,
  };

  await fs.writeFile(OUTPUT_JSON, JSON.stringify(output, null, 2), "utf8");

  const md = [
    "# UI Actions Audit",
    "",
    `- Captured at: ${output.capturedAt}`,
    `- Controls checked: ${output.controlCount}`,
    `- Failed controls: ${output.failedCount}`,
    `- Project id used: ${projectId}`,
    "",
    "## Control Results",
    ...controlResults.map((item) => `- ${failed.includes(item) ? "FAIL" : "PASS"} ${item.page} :: ${item.action} present=${item.present} enabled=${item.enabled} result=${item.result}`),
  ].join("\n");

  await fs.writeFile(OUTPUT_MD, `${md}\n`, "utf8");

  if (failed.length > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error("ui-actions audit failed", error);
  process.exitCode = 1;
});
