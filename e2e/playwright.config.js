import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  testIgnore: process.env.INCLUDE_DEMO ? undefined : '**/full-demo.spec.js',
  timeout: 60000,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:8081',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    video: 'on',
    viewport: { width: 1440, height: 900 },
    channel: 'chrome',
    launchOptions: { slowMo: 350 },
  },
});
