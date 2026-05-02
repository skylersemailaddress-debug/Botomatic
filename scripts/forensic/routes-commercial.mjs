import fs from "fs/promises";
import path from "path";
import { chromium } from "@playwright/test";

const ROOT = process.cwd();
const APP_DIR = path.join(ROOT, "apps", "control-plane", "src", "app");
const OUTPUT_DIR = path.join(ROOT, "receipts", "forensic-readiness");
const OUTPUT_JSON = path.join(OUTPUT_DIR, "routes-commercial.json");
const OUTPUT_MD = path.join(OUTPUT_DIR, "routes-commercial.md");

const BASE_URL = process.env.BASE_URL || "http://127.0.0.1:3000";
const API_BASE_URL = process.env.API_BASE_URL || "http://127.0.0.1:3001";
const TOKEN = process.env.BOTOMATIC_API_TOKEN || process.env.NEXT_PUBLIC_BOTOMATIC_API_TOKEN || "dev-api-token";

const REQUIRED_ROUTES = [
  "/",
  "/projects",
  "/projects/new",
  "/projects/:projectId/vibe",
  "/projects/:projectId/advanced",
];

const FORBIDDEN_STRINGS = [
  "luxora",
  "fake luxury booking",
  "fake users",
  "fake services",
  "demo",
  "example canvas output for this prompt",
  "document-driven preview, not final production rendering",
];

function isNonActionableConsoleError(message) {
  return (
    message.includes("Failed to fetch RSC payload") ||
    message.includes("Falling back to browser navigation") ||
    message.includes("Failed to load resource: the server responded with a status of 403 (Forbidden)") ||
    message.includes("Failed to load resource: the server responded with a status of 404 (Not Found)") ||
    message.includes("Warning: Extra attributes from the server")
  );
}

function now() {
  return new Date().toISOString();
}

function normalizeRoutePath(routePath) {
  if (!routePath.startsWith("/")) return `/${routePath}`;
  return routePath;
}

async function walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walk(full)));
    } else {
      files.push(full);
    }
  }
  return files;
}

function routeFromPageFile(filePath) {
  const rel = path.relative(APP_DIR, filePath).replace(/\\/g, "/");
  if (!rel.endsWith("/page.tsx") && rel !== "page.tsx") return null;
  if (rel === "page.tsx") return "/";
  return `/${rel.replace(/\/page\.tsx$/, "")}`;
}

function classifyRoute(route) {
  if (route === "/") return "public";
  if (route.startsWith("/projects")) return "project";
  if (route.startsWith("/api")) return "api-like-ui-route";
  if (route.includes("settings") || route.includes("vault") || route.includes("validators")) return "settings/admin";
  if (route.includes("evidence") || route.includes("logs")) return "evidence/logs";
  return "unknown";
}

function materializeRoute(route, projectId) {
  if (route.includes(":projectId") || route.includes("[projectId]")) {
    return route.replaceAll(":projectId", projectId || "proj_missing").replaceAll("[projectId]", projectId || "proj_missing");
  }
  return route;
}

function isActionableFailedRequest(entry) {
  if (entry.includes("net::ERR_ABORTED")) {
    return false;
  }

  return true;
}

async function request(url, options = {}) {
  try {
    const response = await fetch(url, options);
    const text = await response.text();
    let body = text;
    try {
      body = text ? JSON.parse(text) : null;
    } catch {
      // keep text
    }
    return { ok: response.ok, status: response.status, body };
  } catch (error) {
    return { ok: false, status: 0, body: String(error?.message || error) };
  }
}

async function createProject() {
  const intake = await request(`${API_BASE_URL}/api/projects/intake`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: `Forensic Route Audit ${Date.now()}`,
      request: "Build a private beta-ready workspace with Vibe and Pro controls.",
    }),
  });

  if (intake.status !== 200 || !intake.body?.projectId) {
    throw new Error(`Unable to create project for route audit: status=${intake.status}`);
  }

  return String(intake.body.projectId);
}

async function main() {
  await fs.mkdir(OUTPUT_DIR, { recursive: true });

  const files = await walk(APP_DIR);
  const routeSet = new Set(REQUIRED_ROUTES);
  for (const filePath of files) {
    const route = routeFromPageFile(filePath);
    if (route) {
      routeSet.add(normalizeRoutePath(route));
    }
  }

  const routeTemplates = Array.from(routeSet).sort((a, b) => a.localeCompare(b));
  const projectId = await createProject();

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  const routeResults = [];

  for (const routeTemplate of routeTemplates) {
    const route = materializeRoute(routeTemplate, projectId);
    const url = `${BASE_URL}${route}`;

    const consoleErrors = [];
    const failedRequests = [];

    const onConsole = (message) => {
      if (message.type() === "error") {
        consoleErrors.push(message.text());
      }
    };
    const onRequestFailed = (request) => {
      failedRequests.push(`${request.method()} ${request.url()} :: ${request.failure()?.errorText || "unknown"}`);
    };

    page.on("console", onConsole);
    page.on("requestfailed", onRequestFailed);

    let responseStatus = 0;
    let visibleErrorBoundaryText = "";

    try {
      const response = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
      responseStatus = response ? response.status() : 0;
    } catch (error) {
      consoleErrors.push(`NAVIGATION_ERROR ${String(error?.message || error)}`);
    }

    const bodyText = (await page.locator("body").textContent()) || "";

    if (bodyText.includes("Launch Error")) {
      visibleErrorBoundaryText = "Launch Error";
    }

    const shellExpected = route.startsWith(`/projects/${projectId}`);
    let shellPresent = false;
    if (shellExpected) {
      shellPresent =
        (await page.getByRole("complementary", { name: "Project navigation" }).count()) > 0 ||
        (await page.getByText("Commercial workspace", { exact: true }).count()) > 0 ||
        (await page.getByTestId("vibe-right-rail").count()) > 0 ||
        (await page.getByTestId("pro-grid").count()) > 0 ||
        (await page.getByTestId("commercial-vibe-right-rail").count()) > 0 ||
        (await page.getByTestId("commercial-pro-grid").count()) > 0 ||
        (await page.getByTestId("commercial-product-sidebar").count()) > 0;
    }

    const forbiddenMatches = FORBIDDEN_STRINGS.filter((needle) => bodyText.toLowerCase().includes(needle));

    const hasHorizontalOverflow = await page.evaluate(() => {
      const doc = document.documentElement;
      return doc.scrollWidth > doc.clientWidth + 1;
    });

    const hasRawGunk =
      bodyText.includes("Apply destructive sample") ||
      bodyText.includes("Example canvas output for this prompt.") ||
      bodyText.includes("Document-driven preview, not final production rendering.");

    const actionableFailedRequests = failedRequests.filter(isActionableFailedRequest);
    const actionableConsoleErrors = consoleErrors.filter((message) => !isNonActionableConsoleError(message));

    const failReasons = [];
    if (responseStatus >= 500 || responseStatus === 0) failReasons.push(`http_status_${responseStatus}`);
    if (actionableConsoleErrors.length > 0) failReasons.push("console_errors");
    if (actionableFailedRequests.length > 0) failReasons.push("failed_network_requests");
    if (visibleErrorBoundaryText === "Launch Error") failReasons.push("launch_error_visible");
    if (forbiddenMatches.length > 0) failReasons.push("forbidden_strings");
    if (hasRawGunk) failReasons.push("raw_gunk_content");
    if (hasHorizontalOverflow) failReasons.push("horizontal_overflow");
    if (shellExpected && !shellPresent) failReasons.push("missing_commercial_shell");

    routeResults.push({
      routeTemplate,
      route,
      url,
      classification: classifyRoute(routeTemplate),
      requiredParams: routeTemplate.includes(":projectId") ? ["projectId"] : [],
      responseStatus,
      consoleErrors: actionableConsoleErrors,
      failedRequests: actionableFailedRequests,
      visibleErrorBoundaryText,
      shellExpected,
      shellPresent,
      forbiddenMatches,
      hasHorizontalOverflow,
      hasRawGunk,
      pass: failReasons.length === 0,
      failReasons,
    });

    page.off("console", onConsole);
    page.off("requestfailed", onRequestFailed);
  }

  await context.close();
  await browser.close();

  const failedRoutes = routeResults.filter((item) => !item.pass);

  const output = {
    capturedAt: now(),
    baseUrl: BASE_URL,
    apiBaseUrl: API_BASE_URL,
    projectId,
    routeCount: routeResults.length,
    failedCount: failedRoutes.length,
    pass: failedRoutes.length === 0,
    routes: routeResults,
  };

  await fs.writeFile(OUTPUT_JSON, JSON.stringify(output, null, 2), "utf8");

  const md = [
    "# Commercial Route Audit",
    "",
    `- Captured at: ${output.capturedAt}`,
    `- Route count: ${output.routeCount}`,
    `- Failed count: ${output.failedCount}`,
    `- Project id used: ${projectId}`,
    "",
    "## Route Results",
    ...routeResults.map(
      (item) =>
        `- ${item.pass ? "PASS" : "FAIL"} ${item.route} status=${item.responseStatus} shell=${item.shellExpected ? (item.shellPresent ? "present" : "missing") : "n/a"} reasons=${item.failReasons.join(",") || "none"}`,
    ),
  ].join("\n");

  await fs.writeFile(OUTPUT_MD, `${md}\n`, "utf8");

  if (failedRoutes.length > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error("routes-commercial audit failed", error);
  process.exitCode = 1;
});
