import { test, expect, type APIRequestContext } from "@playwright/test";
import fs from "fs";
import path from "path";
import os from "os";
import { execSync } from "child_process";

const BASE_URL = process.env.BASE_URL || "http://127.0.0.1:3000";
const API_BASE_URL = process.env.API_BASE_URL || "http://127.0.0.1:3001";
const TOKEN = process.env.BOTOMATIC_API_TOKEN || "dev-api-token";
const SCREENSHOT_DIR = path.join(process.cwd(), "receipts", "beta-simulation", "screenshots");

/**
 * Known non-fatal console messages that should not fail the owner-launch test.
 * These are browser/runtime messages unrelated to application correctness.
 * Restored from main/#655.
 */
const KNOWN_CONSOLE_ERROR_ALLOWLIST: RegExp[] = [
  // Next.js dev-mode hydration hints (not production errors)
  /ERR_ABORTED/i,
  /Failed to load resource.*favicon/i,
  /Failed to load resource.*_next\/static/i,
  /Failed to fetch RSC payload/i,
  /Warning: Extra attributes from the server/i,
  // Prefetch warnings that are benign in test environments
  /Prefetch timeout/i,
  /net::ERR_FAILED.*prefetch/i,
  // Content Security Policy reports from dev server
  /Content Security Policy/i,
  // Extension/browser noise
  /Extension context/i,
];

function isAllowedConsoleError(msg: string): boolean {
  return KNOWN_CONSOLE_ERROR_ALLOWLIST.some((pattern) => pattern.test(msg));
}

function sanitizeRouteForScreenshot(route: string): string {
  return route.replace(/[^a-z0-9]+/gi, "-") || "root";
}

async function assertSharedShell(page: import("@playwright/test").Page) {
  await expect(page.locator('[data-testid="project-workspace-sidebar"]')).toBeVisible();
  await expect(page.locator('[data-testid="nav-vibe"]')).toBeVisible();
  await expect(page.locator('[data-testid="nav-advanced"]')).toBeVisible();
}

async function safeClickByName(page: import("@playwright/test").Page, name: string | RegExp) {
  const button = page.getByRole("button", { name }).first();
  if ((await button.count()) === 0) return;
  await button.scrollIntoViewIfNeeded();
  if (await button.isDisabled()) return;
  await button.click({ timeout: 5000 });
}

async function createUploadFixtures() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "botomatic-beta-upload-"));
  const txtPath = path.join(dir, "beta-upload.txt");
  const zipPath = path.join(dir, "beta-upload.zip");
  fs.writeFileSync(txtPath, "Botomatic beta upload fixture\n", "utf8");
  let zipAvailable = false;
  try {
    execSync(`zip -j ${JSON.stringify(zipPath)} ${JSON.stringify(txtPath)}`, { stdio: "ignore" });
    zipAvailable = fs.existsSync(zipPath);
  } catch {
    zipAvailable = false;
  }
  return { dir, txtPath, zipPath, zipAvailable };
}

async function captureRouteScreenshot(page: import("@playwright/test").Page, route: string, kind: "desktop" | "mobile") {
  await page.screenshot({
    path: path.join(SCREENSHOT_DIR, `${sanitizeRouteForScreenshot(route)}-${kind}.png`),
    fullPage: true,
  });
}

async function createProject(request: APIRequestContext, suffix: string) {
  const intake = await request.post(`${API_BASE_URL}/api/projects/intake`, {
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "Content-Type": "application/json",
    },
    data: {
      name: `Beta Owner Launch ${suffix}`,
      request: `Build a commercial launch-ready dashboard for ${suffix} with auth, approvals, observability, and generated app checks.`,
    },
  });
  expect(intake.ok()).toBeTruthy();
  const body = await intake.json();
  return String(body.projectId);
}

test.beforeAll(async () => {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
});

test("desktop owner launch routes", async ({ page, request }) => {
  const projectId = await createProject(request, "desktop");
  const consoleErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error" && !isAllowedConsoleError(message.text())) consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => { const msg = String(error.message || error); if (!isAllowedConsoleError(msg)) consoleErrors.push(msg); });

  const routes = [
    "/",
    `/projects/${projectId}`,
    `/projects/${projectId}/vibe`,
    `/projects/${projectId}/advanced`,
    `/projects/${projectId}/settings`,
    `/projects/${projectId}/deployment`,
    `/projects/${projectId}/evidence`,
    `/projects/${projectId}/logs`,
  ];

  for (const route of routes) {
    const response = await page.goto(`${BASE_URL}${route}`, { waitUntil: "domcontentloaded" });
    expect(response && response.ok()).toBeTruthy();
    await expect(page.locator("body")).toBeVisible();
    await captureRouteScreenshot(page, route, "desktop");
  }

  const links = await page.locator("a[href]").evaluateAll((nodes) => nodes.map((node) => node.getAttribute("href")).filter(Boolean));
  const sameOriginLinks = Array.from(new Set(links.filter((href) => typeof href === "string" && href.startsWith("/")))).slice(0, 20);
  for (const href of sameOriginLinks) {
    const response = await request.get(`${BASE_URL}${href}`);
    expect(response.status()).toBeLessThan(400);
  }

  expect(consoleErrors.filter((message) => !isAllowedConsoleError(message))).toEqual([]);
});

test("mobile owner launch routes", async ({ browser, request }) => {
  const projectId = await createProject(request, "mobile");
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  const consoleErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error" && !isAllowedConsoleError(message.text())) consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => { const msg = String(error.message || error); if (!isAllowedConsoleError(msg)) consoleErrors.push(msg); });

  const routes = [`/projects/${projectId}`, `/projects/${projectId}/vibe`, `/projects/${projectId}/advanced`];
  for (const route of routes) {
    const response = await page.goto(`${BASE_URL}${route}`, { waitUntil: "domcontentloaded" });
    expect(response && response.ok()).toBeTruthy();
    await expect(page.locator("body")).toBeVisible();
    await captureRouteScreenshot(page, route, "mobile");
  }

  expect(consoleErrors.filter((message) => !isAllowedConsoleError(message))).toEqual([]);
  await context.close();
});

test("beta-user acceptance controls and shell integrity", async ({ page, request }) => {
  const projectId = await createProject(request, "acceptance");
  const consoleErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error" && !isAllowedConsoleError(message.text())) consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => {
    const msg = String(error.message || error);
    if (!isAllowedConsoleError(msg)) consoleErrors.push(msg);
  });

  // Home/start path should resolve to a generated project route.
  await page.goto(`${BASE_URL}/`, { waitUntil: "domcontentloaded" });
  await expect(page).toHaveURL(/\/projects\/.+/);

  // New project flow should work from sidebar link.
  await page.goto(`${BASE_URL}/projects/${projectId}`, { waitUntil: "domcontentloaded" });
  await assertSharedShell(page);
  await page.getByRole("link", { name: /\+ New Project/i }).click();
  await expect(page).toHaveURL(/\/projects\/.+/);

  // Vibe checks.
  await page.goto(`${BASE_URL}/projects/${projectId}/vibe`, { waitUntil: "domcontentloaded" });
  await assertSharedShell(page);
  await expect(page.locator('[data-testid="vibe-dashboard-layout"]')).toBeVisible();
  await expect(page.locator('[data-testid="vibe-right-rail"]')).toBeVisible();
  await expect(page.locator('[data-testid="vibe-input-shell"]')).toBeVisible();
  await expect(page.locator('[data-testid="vibe-preview-canvas"]')).toBeVisible();
  await expect(page.locator("text=Apply destructive sample")).toHaveCount(0);
  await expect(page.locator("text=latestReviewPayload")).toHaveCount(0);
  await expect(page.locator("text=JSON.stringify")).toHaveCount(0);
  await expect(page.locator("text=Document-driven preview, not final production rendering.")).toHaveCount(0);

  await safeClickByName(page, "Desktop");
  await safeClickByName(page, "Tablet");
  await safeClickByName(page, "Mobile");
  await safeClickByName(page, "Share");
  await expect(page.getByRole("button", { name: /Launch unavailable/i }).first()).toBeDisabled();

  const commandInput = page.getByPlaceholder(/Type a direct command/i).first();
  if ((await commandInput.count()) > 0) {
    await commandInput.fill("add a testimonials section");
    await safeClickByName(page, /Run Command/i);
  }

  const promptInput = page.getByLabel(/Vibe orchestration prompt/i).first();
  if ((await promptInput.count()) > 0) {
    await promptInput.fill("make the hero section cleaner");
    await safeClickByName(page, /^Send$/);
  }

  for (const chip of [
    "Make it more minimal",
    "Change the color to emerald",
    "Add testimonials",
    "Improve Design",
    "Add Page",
    "Add Feature",
    "Connect Payments",
    "Run Tests",
    "Launch App",
  ]) {
    await safeClickByName(page, new RegExp(`^${chip}$`, "i"));
  }

  for (const railHeading of ["Build Map", "Live Preview", "App Health", "What's Next", "Recent Activity", "One-Click Launch"]) {
    await expect(page.getByRole("heading", { name: railHeading })).toBeVisible();
  }

  await captureRouteScreenshot(page, `/projects/${projectId}/vibe`, "desktop");
  await captureRouteScreenshot(page, `/projects/${projectId}`, "desktop");

  // Pro checks.
  await page.goto(`${BASE_URL}/projects/${projectId}/advanced`, { waitUntil: "domcontentloaded" });
  await assertSharedShell(page);
  await expect(page.locator('[data-testid="pro-toolbar"]')).toBeVisible();
  await expect(page.locator('[data-testid="pro-grid"]')).toBeVisible();
  await expect(page.locator('[data-testid="pro-status-bar"]')).toBeVisible();
  await expect(page.locator('[data-testid="pro-panel"]')).toHaveCount(10);

  for (const panel of ["Build Pipeline", "System Health", "Code Changes", "Live Application", "Services", "Database Schema", "Test Results", "Terminal", "AI Copilot", "Recent Commits"]) {
    await expect(page.getByRole("heading", { name: panel }).first()).toBeVisible();
  }

  for (const subnav of ["Overview", "Tests", "Deployments", "Audit Log", "Secrets", "Settings"]) {
    const target = page.getByRole("link", { name: subnav }).first();
    if ((await target.count()) > 0) await target.click();
  }

  await page.goto(`${BASE_URL}/projects/${projectId}/advanced`, { waitUntil: "domcontentloaded" });
  await safeClickByName(page, /^Run$/);
  await safeClickByName(page, /^Launch$/);
  await safeClickByName(page, /^Deploy$/);
  await captureRouteScreenshot(page, `/projects/${projectId}/advanced`, "desktop");

  // Subpages must retain shared shell and not regress to raw/debug UI.
  const subpages = ["settings", "deployment", "evidence", "logs", "vault", "onboarding", "validators"];
  for (const sub of subpages) {
    const route = `/projects/${projectId}/${sub}`;
    const response = await page.goto(`${BASE_URL}${route}`, { waitUntil: "domcontentloaded" });
    expect(response && response.ok()).toBeTruthy();
    await assertSharedShell(page);
    await expect(page.locator("pre")).toHaveCount(0);
    await expect(page.locator("text=JSON.stringify")).toHaveCount(0);
    await expect(page.locator("text=latestReviewPayload")).toHaveCount(0);
  }
  await page.goto(`${BASE_URL}/projects/${projectId}/settings`, { waitUntil: "domcontentloaded" });
  await captureRouteScreenshot(page, `/projects/${projectId}/settings`, "desktop");

  // Known unavailable controls must be explicitly disabled with honest copy.
  await expect(page.getByRole("button", { name: /Upgrade unavailable/i })).toBeDisabled();
  await expect(page.getByRole("button", { name: /Manage unavailable/i })).toBeDisabled();

  // Upload flow probe: if a file input exists on tested routes, upload safe fixtures.
  const fileInputs = page.locator('input[type="file"]');
  if ((await fileInputs.count()) > 0) {
    const fixtures = await createUploadFixtures();
    await fileInputs.first().setInputFiles(fixtures.txtPath);
    if (fixtures.zipAvailable) {
      await fileInputs.first().setInputFiles(fixtures.zipPath);
    }
  }

  // Mobile core checks for Vibe and Pro.
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${BASE_URL}/projects/${projectId}/vibe`, { waitUntil: "domcontentloaded" });
  await assertSharedShell(page);
  const hasOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  expect(hasOverflow).toBeFalsy();
  await captureRouteScreenshot(page, `/projects/${projectId}/vibe`, "mobile");

  await page.goto(`${BASE_URL}/projects/${projectId}/advanced`, { waitUntil: "domcontentloaded" });
  await assertSharedShell(page);
  await expect(page.locator('[data-testid="pro-grid"]')).toBeVisible();
  await captureRouteScreenshot(page, `/projects/${projectId}/advanced`, "mobile");

  expect(consoleErrors.filter((message) => !isAllowedConsoleError(message))).toEqual([]);
});