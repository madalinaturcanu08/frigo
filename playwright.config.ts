import { defineConfig, devices } from '@playwright/test';
import { loadEnvConfig } from '@next/env';

// Same Supabase project and keys as the app (.env.local).
loadEnvConfig(process.cwd());

const PORT = 3100;

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: false, // the tests share one temporary account and run in order
  workers: 1,
  retries: 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  timeout: 45_000,
  globalSetup: './tests/e2e/global-setup.ts',
  globalTeardown: './tests/e2e/global-teardown.ts',
  use: {
    baseURL: `http://localhost:${PORT}`,
    storageState: 'tests/e2e/.auth/state.json',
    trace: 'retain-on-failure',
    serviceWorkers: 'allow',
  },
  projects: [
    { name: 'phone', use: { ...devices['Pixel 7'] } },
    // Safari's engine — iPhone users get WebKit whatever browser they pick.
    { name: 'iphone', use: { ...devices['iPhone 15'] } },
  ],
  webServer: {
    // A production build: offline mode (service worker caching) only runs there.
    command: `NEXT_DIST_DIR=.next-e2e npx next build && NEXT_DIST_DIR=.next-e2e npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}/welcome`,
    reuseExistingServer: !process.env.CI,
    timeout: 240_000,
  },
});
