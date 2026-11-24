import { defineConfig, devices } from '@playwright/test';

const basePath = process.env.PLAYWRIGHT_BASE_PATH || '/';
const baseURL = 'http://127.0.0.1:4173' + basePath;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  workers: process.env.CI ? 2 : 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: 'list',
  use: {
    baseURL,
    trace: 'retain-on-failure',
    ...(process.env.PLAYWRIGHT_CHANNEL ? { channel: process.env.PLAYWRIGHT_CHANNEL } : {}),
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } }],
  webServer: {
    command: (process.env.PLAYWRIGHT_STATIC ? 'npm run preview' : 'npm run dev') + ' -- --host 127.0.0.1 --port 4173 --strictPort --base=' + basePath,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
  },
});
