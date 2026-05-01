import { test, expect, type APIRequestContext } from "@playwright/test";
import fs from "fs";
import path from "path";

const BASE_URL = process.env.BASE_URL || "http://127.0.0.1:3000";
const API_BASE_URL = process.env.API_BASE_URL || "http://127.0.0.1:3001";
const TOKEN = process.env.BOTOMATIC_API_TOKEN || "dev-api-token";




const SCREENSHOT_DIR = path.join(process.cwd(), "receipts", "beta-simulation", "screenshots");

function isNonFatalOwnerLaunchConsoleNoise(message: string) {
  return (
    message.includes("Failed to fetch RSC payload") ||
    message.includes("Falling back to browser navigation") ||
    message.includes("caret-color: transparent") ||
    message.includes("Warning: Prop `%s` did not match")
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

test.beforeAll(async () => {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
});

test("desktop owner launch routes", async ({ page, request }) => {
  const projectId = await createProject(request, "desktop");
  const consoleErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => consoleErrors.push(String(error.message || error)));

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
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, `${route.replace(/[^a-z0-9]+/gi, "-") || "root"}-desktop.png`), fullPage: true });
  }

  const links = await page.locator("a[href]").evaluateAll((nodes) => nodes.map((node) => node.getAttribute("href")).filter(Boolean));
  const sameOriginLinks = Array.from(new Set(links.filter((href) => typeof href === "string" && href.startsWith("/")))).slice(0, 20);
  for (const href of sameOriginLinks) {
    const response = await request.get(`${BASE_URL}${href}`);
    expect(response.status()).toBeLessThan(400);
  }

  const actionableConsoleErrors = consoleErrors.filter((m) => !isNonFatalOwnerLaunchConsoleNoise(m));
  expect(actionableConsoleErrors).toEqual([]);
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
    const response = await page.goto(`${BASE_URL}${route}`, { waitUntil: "domcontentloaded" });
    expect(response && response.ok()).toBeTruthy();
    await expect(page.locator("body")).toBeVisible();
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, `${route.replace(/[^a-z0-9]+/gi, "-")}-mobile.png`), fullPage: true });
  }

  const actionableConsoleErrors = consoleErrors.filter((m) => !isNonFatalOwnerLaunchConsoleNoise(m));
  expect(actionableConsoleErrors).toEqual([]);
  await context.close();
});
