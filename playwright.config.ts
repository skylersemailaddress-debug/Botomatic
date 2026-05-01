import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'packages/validation/src/visual',
  timeout: 60_000,
  expect: {
    timeout: 10_000,
  },
  webServer: {
    command: 'npm --prefix apps/control-plane run dev',
    url: 'http://127.0.0.1:3000',
    reuseExistingServer: true,
    timeout: 120_000,
  },
  use: {
    baseURL: 'http://127.0.0.1:3000',
    headless: true,
  },
});
