# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

End-to-end Playwright/TypeScript automation framework for the public demo site
[automationexercise.com](https://automationexercise.com). Development stage — small test surface today
(`login-user.spec.ts`, `register-user.spec.ts`), but the layered architecture below is meant to scale.

The full convention set lives in `.agents/skills/playwright-best-practices/SKILL.md` and its linked
reference files — consult it (via the `playwright-best-practices` skill) for anything not covered here,
especially before adding new patterns (mocking, multi-tab, iframes, CI, etc.).

## Commands

```bash
npm test                  # run the suite (Chromium)
npm run test:headed       # run with a visible browser
npm run test:debug        # run with the Playwright Inspector
npx playwright test src/tests/login-user.spec.ts   # run a single file
npx playwright test -g "logs in with valid credentials"  # run by title
npx playwright test --grep @smoke                  # run by tag
npx playwright test --repeat-each=5                # flakiness check for a test/file

npm run typecheck         # tsc --noEmit (strict)
npm run lint              # ESLint 9
npm run lint:fix
npm run format             # prettier --write .
npm run format:check

npm run allure:generate && npm run allure:open   # or: npm run allure:serve
```

Never pass `--reporter=` on the CLI — it overrides the `reporter` array in `playwright.config.ts` and
disables Allure. Add reporters to the config instead.

After writing or changing tests: run them, fix locators/waits/assertions from the trace
(`npx playwright show-trace`) on failure, and only consider the work done once they pass.

## Architecture

Strictly layered; each layer only calls the layer directly below it:

```
src/
├── tests/        scenarios only — import test/expect from fixtures/, never @playwright/test
├── assistants/   multi-step, cross-page workflows (login, registration); each public
│                 method is @step-decorated so its actions nest under one named parent
├── asserts/      verification helpers wrapping expect() in test.step ("ASSERT ...")
├── pages/        page objects: locators only (extend BasePage, set PAGE_NAME)
├── components/   reusable UI blocks injected flat (NavBar) — never composed into pages
├── utils/        Element (Locator wrapper, auto-steps every action) + ElementFactory
│                 (builds `[Page] "Name"` labels) + step (method decorator)
├── fixtures/     auto-registering DI container; exports `test` and `expect`
├── api/          thin APIRequestContext clients to arrange/clean up state fast (AccountApi)
├── helpers/      factories for entities a test creates, randomised per run (userFactory)
└── config/       env.ts (URLs from process.env) + testData.ts (fixed identity)
```

### Critical conventions

- **Import `test`/`expect` from `../fixtures`, never from `@playwright/test`**, in specs.
- **Never call Playwright locator methods directly** in tests or page objects. Declare locators via
  `this.el(name, locator)` on `BasePage`; act through the returned `Element`, which auto-wraps every
  action in `test.step`.
- **Page objects hold locators only.** Behavior lives in `assistants/`; verification lives in `asserts/`.
- **Use `asserts/` (e.g. `CommonAsserts`) instead of raw `expect()`** in tests, so reports show readable,
  stepped `ASSERT ...` entries.
- **Adding a class to a barrel `index.ts`** (`pages`, `components`, `asserts`, `assistants`)
  **auto-creates its fixture** in `fixtures/index.ts` — the object key becomes the fixture name. No
  manual wiring needed.
- **Report hierarchy**: every public `assistants/` method carries `@step(...)` (from `utils/step`) so its
  element-level actions nest under one named parent instead of appearing flat. Don't hand-roll
  `test.step` calls inside method bodies, and don't `@step` page objects/components (locators only).
- **Test data split by responsibility**: `config/` for environment/credentials/fixed identity (`testUser`
  in `testData.ts`); `helpers/` factories for entities a test *creates* (e.g. `buildRegistrationUser`
  derives a unique-per-run email so reruns never collide with an already-registered account).
- **Preconditions via API, not UI**: arrange state a test depends on but doesn't exercise (e.g. an
  existing account to log in with) through `api/` clients exposed as fixtures (see `registeredUser` in
  `fixtures/index.ts`, backed by `AccountApi`). Drive only the flow under test through the UI. Assert API
  setup on the response body, not just HTTP status — this site always returns 200.
- **Timeouts are centralised** in `playwright.config.ts` (`actionTimeout`, `navigationTimeout`,
  `expect.timeout`). `Element` carries no baked-in timeout defaults — don't add hardcoded waits/sleeps.
- **Global chrome** (header `NavBar`, footer, generic dialogs) is injected flat as its own fixture, never
  composed into a page object (no `homePage.nav`) — it isn't owned by any single page. Reserve
  composition (`parentPage.block`) for fragments genuinely owned by one page's container.
- **Modals/dialogs** are separate, flat-injected surfaces scoped by their own root (`getByRole('dialog')`
  etc.), not page fragments — they're typically portal-rendered outside the page's DOM subtree.
- **Reporting is Allure-first**; screenshots/trace/video retained on failure only.
- Browser matrix: projects partition by site (Chromium only here); cross-browser is a separate axis, not
  currently enabled.

### Known target-site quirks (already handled — don't work around them again)

- **Intermittent blank POST-navigation pages** (`/signup`, `/account_created`): absorbed by Playwright
  `retries: 2` in `playwright.config.ts` (a fresh full re-run with a new unique user), not a hardcoded
  wait.
- **Google "vignette" interstitial ads** can hijack page transitions: the `isolateThirdParties`
  auto-fixture in `fixtures/index.ts` allowlists `automationexercise.com` and aborts all third-party
  requests (except top-level navigations), so the ads never load.
- **Duplicate emails are rejected** by the site: mitigated by the unique-per-run email alias in
  `helpers/userFactory.ts`.
- **Non-semantic headings** (`ENTER ACCOUNT INFORMATION`, `ACCOUNT CREATED!`, `ACCOUNT DELETED!`) are
  CSS-uppercased `<b>`/`<h2>` text — locate via `getByText`/`data-qa`, not `getByRole('heading')`.
- The app's test-hook attribute is `data-qa` (configured as `testIdAttribute` in `playwright.config.ts`),
  so `getByTestId(...)` resolves against `data-qa`, not `data-testid`.
