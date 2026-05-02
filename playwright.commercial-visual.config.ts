import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: ".",
  testMatch: ["tests/e2e/visual/**/*.spec.ts"],
  timeout: 60_000,
  use: {
    baseURL: process.env.VISUAL_BASE_URL || "http://127.0.0.1:3000",
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 1,
    screenshot: "only-on-failure",
  },
});
