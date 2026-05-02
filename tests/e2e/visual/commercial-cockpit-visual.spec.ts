import { test, expect } from "@playwright/test";

const BASE_URL = process.env.VISUAL_BASE_URL || "http://127.0.0.1:3000";
const API_BASE_URL = process.env.API_BASE_URL || "http://127.0.0.1:3001";
const API_TOKEN = process.env.BOTOMATIC_API_TOKEN || process.env.NEXT_PUBLIC_BOTOMATIC_API_TOKEN || "dev-api-token";

let PROJECT_ID = process.env.VISUAL_PROJECT_ID || "";

type VisualRoute = {
  name: string;
  path: (projectId: string) => string;
  required: string[];
  forbidden: string[];
};

const routes: VisualRoute[] = [
  {
    name: "vibe-desktop",
    path: (projectId: string) => `/projects/${projectId}/vibe`,
    required: [
      "[data-testid='commercial-shell']",
      "[data-testid='commercial-product-sidebar']",
      "[data-testid='commercial-vibe-cockpit']",
      "[data-testid='commercial-vibe-right-rail']",
      "[data-testid='commercial-vibe-command-bar']",
    ],
    forbidden: ["Luxora", "Luxury Booking Site", "Your Escape Awaits", "Alex Johnson", "92%"],
  },
  {
    name: "pro-desktop",
    path: (projectId: string) => `/projects/${projectId}/advanced`,
    required: [
      "[data-testid='commercial-shell']",
      "[data-testid='commercial-product-sidebar']",
      "[data-testid='commercial-pro-cockpit']",
      "[data-testid='commercial-pro-grid']",
    ],
    forbidden: ["Luxora", "Luxury Booking Site", "Your Escape Awaits", "Alex Johnson", "92%", "198 Total Tests"],
  },
];

test.describe("commercial cockpit visual clone harness", () => {
  test.use({ viewport: { width: 2048, height: 1365 }, deviceScaleFactor: 1 });

  test.beforeAll(async ({ request }) => {
    if (PROJECT_ID) {
      return;
    }

    const intake = await request.post(`${API_BASE_URL}/api/projects/intake`, {
      headers: {
        Authorization: `Bearer ${API_TOKEN}`,
        "Content-Type": "application/json",
      },
      data: {
        name: `Visual Contract ${Date.now()}`,
        request: "Build a private-beta project shell for visual contract verification.",
      },
    });

    expect(intake.ok()).toBeTruthy();
    const body = await intake.json();
    PROJECT_ID = String(body.projectId || "");
    expect(PROJECT_ID.length).toBeGreaterThan(0);
  });

  for (const route of routes) {
    test(`${route.name} commercial DOM and screenshot contract`, async ({ page }) => {
      await page.goto(`${BASE_URL}${route.path(PROJECT_ID)}`, { waitUntil: "networkidle" });

      for (const selector of route.required) {
        await expect(page.locator(selector)).toBeVisible();
      }

      for (const text of route.forbidden) {
        await expect(page.getByText(text, { exact: false })).toHaveCount(0);
      }

      const metrics = await page.evaluate(() => {
        const shell = document.querySelector("[data-testid='commercial-shell']") as HTMLElement | null;
        const sidebar = document.querySelector("[data-testid='commercial-product-sidebar']") as HTMLElement | null;
        const main = document.querySelector(".commercial-main") as HTMLElement | null;
        const body = document.body;
        const doc = document.documentElement;
        return {
          viewportWidth: window.innerWidth,
          viewportHeight: window.innerHeight,
          bodyScrollWidth: body.scrollWidth,
          docScrollWidth: doc.scrollWidth,
          shellRight: shell?.getBoundingClientRect().right ?? 0,
          sidebarWidth: sidebar?.getBoundingClientRect().width ?? 0,
          mainRight: main?.getBoundingClientRect().right ?? 0,
        };
      });

      expect(metrics.bodyScrollWidth).toBeLessThanOrEqual(metrics.viewportWidth + 2);
      expect(metrics.docScrollWidth).toBeLessThanOrEqual(metrics.viewportWidth + 2);
      expect(metrics.shellRight).toBeLessThanOrEqual(metrics.viewportWidth + 2);
      expect(metrics.mainRight).toBeLessThanOrEqual(metrics.viewportWidth + 2);
      expect(metrics.sidebarWidth).toBeGreaterThanOrEqual(220);
      expect(metrics.sidebarWidth).toBeLessThanOrEqual(250);

      await page.screenshot({
        path: `tests/visual/current/${route.name}.png`,
        fullPage: false,
      });
    });
  }
});
