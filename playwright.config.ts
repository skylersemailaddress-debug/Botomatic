import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'packages/validation/src/visual',
  use: {
    baseURL: 'http://localhost:3000',
    headless: true,
  },
});
