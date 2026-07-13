import { defineConfig, devices } from '@playwright/test';
import { env } from './src/config/env';

/**
 * Centralised Playwright configuration.
 *
 * Per SKILL.md: all timeouts live here (the `Element` wrapper carries no
 * baked-in timeout defaults), reporting is Allure-first, and projects
 * partition by site (Chromium only in this repo).
 */
export default defineConfig({
  testDir: './src/tests',
  outputDir: './test-results',

  // Fail the build on CI if a `test.only` was committed.
  forbidOnly: !!process.env.CI,

  fullyParallel: true,
  // The target is a slow public demo site that intermittently returns an
  // incomplete document on POST-navigations (e.g. /signup, /account_created).
  // Retries re-run the whole journey fresh (new unique user) and absorb those
  // transient SUT blips — they are not a substitute for proper waiting, which
  // is handled by web-first assertions.
  retries: 2,
  // On CI pin to a single worker; locally let Playwright pick (omit the key
  // entirely to satisfy `exactOptionalPropertyTypes`).
  ...(process.env.CI ? { workers: 1 } : {}),

  // Per-test timeout and centralised expect timeout. The target site is slow
  // and server-renders post-submit pages, so assertions that wait on a
  // navigation get extra headroom (centralised here — never a hardcoded sleep).
  timeout: 60_000,
  expect: {
    timeout: 15_000,
  },

  // Allure-first reporting. `list` keeps console output readable.
  // NOTE: never override this with a CLI `--reporter=` flag (it disables Allure).
  reporter: [
    ['list'],
    ['allure-playwright', { resultsDir: 'allure-results', detail: true }],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
  ],

  use: {
    baseURL: env.baseURL,

    // Centralised action/navigation timeouts.
    actionTimeout: 15_000,
    navigationTimeout: 30_000,

    // App-specific test hook attribute -> getByTestId('signup-button').
    testIdAttribute: 'data-qa',

    // Debugging artifacts preserved only when useful.
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'automationexercise-chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
