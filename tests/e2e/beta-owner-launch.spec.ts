import { test, expect, type APIRequestContext, type Page } from "@playwright/test";
import fs from "fs";
import path from "path";

const BASE_URL = process.env.BASE_URL || "http://127.0.0.1:3000";
const API_BASE_URL = process.env.API_BASE_URL || "http://127.0.0.1:3001";
const TOKEN = process.env.BOTOMATIC_API_TOKEN || "dev-api-token";




const SCREENSHOT_DIR = path.join(process.cwd(), "receipts", "beta-simulation", "screenshots");
const CHROMEBOOK_VIEWPORT = { width: 1280, height: 800 };

function isNonFatalOwnerLaunchConsoleNoise(message: string) {
  return (
    message.includes("Failed to fetch RSC payload") ||
    message.includes("Falling back to browser navigation") ||
    message.includes("caret-color: transparent") ||
    message.includes("Warning: Prop `%s` did not match") ||
    message.includes("Hydration failed because the initial UI does not match what was rendered on the server.") ||
    message.includes("There was an error while hydrating.") ||
    message.includes("Warning: An error occurred during hydration.") ||
    message.includes("Failed to load resource: the server responded with a status of 404 (Not Found)")
  );
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

async function expectNoStaleRuntimeDebugUI(page: Page) {
  await expect(page.getByText("Apply destructive sample", { exact: true })).toHaveCount(0);
  await expect(page.getByText("Example canvas output for this prompt.", { exact: true })).toHaveCount(0);
  await expect(page.getByText("Document-driven preview, not final production rendering.", { exact: true })).toHaveCount(0);
}

async function expectCommercialShell(page: Page) {
  await expect(page.locator(".project-workspace-sidebar")).toBeVisible();
  await expect(page.getByTestId("project-workspace-identity-card")).toBeVisible();
}

function screenshotPathForRoute(route: string, suffix: string) {
  return path.join(SCREENSHOT_DIR, `${route.replace(/[^a-z0-9]+/gi, "-") || "root"}-${suffix}.png`);
}

async function gotoStable(page: Page, route: string) {
  const url = `${BASE_URL}${route}`;
  try {
    return await page.goto(url, { waitUntil: "domcontentloaded" });
  } catch (error) {
    const message = String(error);
    if (!message.includes("ERR_ABORTED")) {
      throw error;
    }
    return page.goto(url, { waitUntil: "load" });
  }
}

async function navigateViaSidebarLink(page: Page, testId: string) {
  const link = page.getByTestId(testId).first();
  await expect(link).toBeVisible();
  const href = await link.getAttribute("href");
  expect(href).toBeTruthy();
  if (!href) return;

  try {
    await Promise.all([
      page.waitForURL(new RegExp(`${href.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`)),
      link.click(),
    ]);
  } catch {
    const response = await page.goto(`${BASE_URL}${href}`, { waitUntil: "domcontentloaded" });
    expect(response && response.ok()).toBeTruthy();
  }
}

test.beforeAll(async () => {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
});

test("desktop owner launch routes", async ({ browser, request }) => {
  const projectId = await createProject(request, "desktop");
  const context = await browser.newContext({ viewport: CHROMEBOOK_VIEWPORT });
  const page = await context.newPage();
  const consoleErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => consoleErrors.push(String(error.message || error)));

  const routes = [
    `/projects/${projectId}`,
    `/projects/${projectId}/vibe`,
    `/projects/${projectId}/advanced`,
    `/projects/${projectId}/settings`,
    `/projects/${projectId}/deployment`,
    `/projects/${projectId}/evidence`,
    `/projects/${projectId}/logs`,
    `/projects/${projectId}/vault`,
    `/projects/${projectId}/onboarding`,
    `/projects/${projectId}/validators`,
  ];

  for (const route of routes) {
    const response = await gotoStable(page, route);
    expect(response && response.ok()).toBeTruthy();
    await expect(page.locator("body")).toBeVisible();
    await expectCommercialShell(page);
    await expectNoStaleRuntimeDebugUI(page);

    if (route.endsWith("/advanced")) {
      await expect(page.getByTestId("pro-grid")).toBeVisible();
    }

    if (route.endsWith(`/projects/${projectId}`) || route.endsWith("/vibe")) {
      await expect(page.getByTestId("vibe-right-rail")).toBeVisible();
      await expect(page.getByTestId("live-ui-builder-preview-surface")).toBeVisible();
    }

    await page.screenshot({ path: screenshotPathForRoute(route, "desktop"), fullPage: true });
  }

  await gotoStable(page, `/projects/${projectId}/vibe`);
  await expectCommercialShell(page);
  await expect(page.getByTestId("vibe-right-rail")).toBeVisible();

  await page.getByRole("button", { name: "Desktop", exact: true }).click();
  await page.getByRole("button", { name: "Tablet", exact: true }).click();
  await page.getByRole("button", { name: "Mobile", exact: true }).click();
  await page.getByRole("button", { name: "Desktop", exact: true }).click();

  await page.getByRole("button", { name: "Share" }).click();

  const promptInput = page.getByLabel("Vibe orchestration prompt");
  await expect(promptInput).toBeVisible();
  await promptInput.fill("Add a concise hero section with trust badges");

  const actionChip = page.locator(".vibe-action-row button").first();
  if (await actionChip.count()) {
    await actionChip.click();
  }

  await navigateViaSidebarLink(page, "nav-settings");
  await navigateViaSidebarLink(page, "nav-deployment");
  await navigateViaSidebarLink(page, "nav-evidence");
  await navigateViaSidebarLink(page, "nav-logs");
  await navigateViaSidebarLink(page, "nav-vault");
  await navigateViaSidebarLink(page, "nav-onboarding");
  await navigateViaSidebarLink(page, "nav-validators");
  await navigateViaSidebarLink(page, "nav-advanced");
  await expect(page.getByTestId("pro-grid")).toBeVisible();

  const runButton = page.getByRole("button", { name: "Run autonomous build" });
  const launchButton = page.getByRole("button", { name: "Launch application" });
  const deployButton = page.getByRole("button", { name: "Deploy to production" });
  await expect(runButton).toBeVisible();
  await expect(launchButton).toBeVisible();
  await expect(deployButton).toBeVisible();

  await expectNoStaleRuntimeDebugUI(page);
  await page.screenshot({ path: screenshotPathForRoute(`/projects/${projectId}/vibe`, "desktop-proof") });
  await gotoStable(page, `/projects/${projectId}/advanced`);
  await expect(page.getByTestId("pro-grid")).toBeVisible();
  await expectCommercialShell(page);
  await page.screenshot({ path: screenshotPathForRoute(`/projects/${projectId}/advanced`, "desktop-proof") });

  const links = await page.locator("a[href]").evaluateAll((nodes) => nodes.map((node) => node.getAttribute("href")).filter(Boolean));
  const sameOriginLinks = Array.from(new Set(links.filter((href) => typeof href === "string" && href.startsWith("/")))).slice(0, 20);
  for (const href of sameOriginLinks) {
    const response = await request.get(`${BASE_URL}${href}`);
    expect(response.status()).toBeLessThan(400);
  }

  const actionableConsoleErrors = consoleErrors.filter((m) => !isNonFatalOwnerLaunchConsoleNoise(m));
  expect(actionableConsoleErrors).toEqual([]);
  await context.close();
});

test("mobile owner launch routes", async ({ browser, request }) => {
  const projectId = await createProject(request, "mobile");
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  const consoleErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => consoleErrors.push(String(error.message || error)));

  const routes = [`/projects/${projectId}`, `/projects/${projectId}/vibe`, `/projects/${projectId}/advanced`];
  for (const route of routes) {
    const response = await gotoStable(page, route);
    expect(response && response.ok()).toBeTruthy();
    await expect(page.locator("body")).toBeVisible();
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, `${route.replace(/[^a-z0-9]+/gi, "-")}-mobile.png`), fullPage: true });
  }

  const actionableConsoleErrors = consoleErrors.filter((m) => !isNonFatalOwnerLaunchConsoleNoise(m));
  expect(actionableConsoleErrors).toEqual([]);
  await context.close();
});
