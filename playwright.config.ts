import { defineConfig, devices } from '@playwright/test';

const seeded = process.env.E2E_SEEDED === '1';
const reuseSeededServer = process.env.E2E_REUSE === '1';
const baseURL = process.env.E2E_BASE_URL || (seeded ? 'http://localhost:5175' : 'http://localhost:5173');

export default defineConfig({
  testDir: './e2e',
  timeout: 45_000,
  expect: {
    timeout: 8_000,
    toHaveScreenshot: { maxDiffPixelRatio: 0.025 },
  },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium-desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
    { name: 'chromium-notebook', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } } },
    { name: 'chromium-mobile', use: { ...devices['iPhone 13'], browserName: 'chromium', viewport: { width: 390, height: 844 } } },
    { name: 'chromium-ipad', use: { ...devices['iPad (gen 7)'], browserName: 'chromium', viewport: { width: 768, height: 1024 } } },
    { name: 'webkit-desktop', use: { ...devices['Desktop Safari'], viewport: { width: 1440, height: 900 } } },
  ],
  webServer: seeded
    ? [
        {
          command: 'npm run start:e2e:backend',
          url: 'http://localhost:5110/health',
          reuseExistingServer: reuseSeededServer,
          timeout: 120_000,
        },
        {
          command: 'npm run start:e2e:frontend',
          url: baseURL,
          reuseExistingServer: reuseSeededServer,
          timeout: 120_000,
        },
      ]
    : {
        command: 'npm start',
        url: baseURL,
        reuseExistingServer: true,
        timeout: 120_000,
      },
});
