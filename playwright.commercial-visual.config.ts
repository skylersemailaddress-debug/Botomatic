import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: ".",
  testMatch: ["tests/e2e/visual/**/*.spec.ts"],
  timeout: 90_000,
  webServer: {
    command:
      "API_AUTH_TOKEN=dev-api-token BOTOMATIC_API_TOKEN=dev-api-token NEXT_PUBLIC_BOTOMATIC_API_TOKEN=dev-api-token NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:3001 PORT=3000 npm run ui:dev",
    url: "http://127.0.0.1:3000",
    reuseExistingServer: true,
    timeout: 120_000,
  },
  use: {
    baseURL: process.env.VISUAL_BASE_URL || "http://127.0.0.1:3000",
    viewport: { width: 2048, height: 1365 },
    deviceScaleFactor: 1,
    screenshot: "only-on-failure",
  },
});
