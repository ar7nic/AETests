import { test as base } from '@playwright/test';
import type { Page } from '@playwright/test';
import { pageObjects } from '../pages';
import { components } from '../components';
import { asserts } from '../asserts';
import { assistants } from '../assistants';
import { AccountApi } from '../api';
import { buildRegistrationUser } from '../helpers';
import type { UserCredentials } from '../helpers';

/**
 * Auto-registering DI container.
 *
 * Every class exported from the `pages`, `components`, `asserts` and
 * `assistants` barrels is turned into a Playwright fixture automatically —
 * adding a class to one of those registries is the only step needed to make it
 * injectable in a spec. All registered classes share the
 * `new (page: Page) => T` shape.
 */
const registry = { ...pageObjects, ...components, ...asserts, ...assistants };

type Registry = typeof registry;

/** Maps each registry key to the instance type of its class. */
type AppFixtures = { [K in keyof Registry]: InstanceType<Registry[K]> };

/** The fixture-function shape Playwright expects for each registered class. */
type AppFixtureFns = {
  [K in keyof AppFixtures]: (
    args: { page: Page },
    use: (value: AppFixtures[K]) => Promise<void>,
  ) => Promise<void>;
};

const ctorEntries = Object.entries(registry) as Array<[string, new (page: Page) => unknown]>;

const appFixtures = Object.fromEntries(
  ctorEntries.map(([name, Ctor]) => [
    name,
    async ({ page }: { page: Page }, use: (value: unknown) => Promise<void>) => {
      await use(new Ctor(page));
    },
  ]),
) as AppFixtureFns;

/** Host of the system under test; only same-site requests are allowed through. */
const SUT_HOST = 'automationexercise.com';

function isSameSite(url: string): boolean {
  try {
    const { hostname } = new URL(url);
    return hostname === SUT_HOST || hostname.endsWith(`.${SUT_HOST}`);
  } catch {
    return false;
  }
}

/**
 * The project `test`. Specs import `test`/`expect` from here, never from
 * `@playwright/test`.
 */
export const test = base
  .extend<AppFixtures>(appFixtures)
  .extend<{ isolateThirdParties: void }>({
    // Allowlist the site under test and abort every third party. The target site
    // injects Google ad scripts that occasionally fire a full-page "vignette"
    // interstitial which hijacks page transitions and blanks the document under
    // test. Blocking the scripts outright means the vignette never initialises,
    // making navigation deterministic. The site is fully server-rendered, so no
    // first-party functionality depends on third-party assets.
    isolateThirdParties: [
      async ({ page }, use) => {
        await page.route('**/*', (route) => {
          const request = route.request();
          // Always let a top-level navigation proceed — never blank the page.
          if (request.isNavigationRequest() && request.frame() === page.mainFrame()) {
            return route.continue();
          }
          return isSameSite(request.url()) ? route.continue() : route.abort();
        });
        await use();
      },
      { auto: true },
    ],
  })
  .extend<{ registeredUser: UserCredentials }>({
    // Precondition for login-style tests: arrange a fresh, known account via the
    // API (fast and reliable), expose its credentials, then best-effort delete it
    // on teardown in case the test itself did not.
    registeredUser: async ({ request }, use) => {
      const api = new AccountApi(request);
      const credentials = await api.createAccount(buildRegistrationUser());
      await use(credentials);
      await api.deleteAccountQuietly(credentials);
    },
  });

export { expect } from '@playwright/test';
