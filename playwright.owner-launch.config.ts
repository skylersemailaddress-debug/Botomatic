import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/e2e',
  testMatch: ['beta-owner-launch.spec.ts'],
  use: {
    baseURL: process.env.BASE_URL || 'http://127.0.0.1:3000',
    headless: true,
  },
});