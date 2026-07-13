---
name: playwright-best-practices
description: Use when writing Playwright tests, fixing flaky tests, debugging failures, implementing Page Object Model, configuring CI/CD, optimizing performance, mocking APIs, handling authentication or OAuth, testing accessibility (axe-core), file uploads/downloads, date/time mocking, WebSockets, geolocation, permissions, multi-tab/popup flows, mobile/responsive layouts, touch gestures, GraphQL, error handling, offline mode, multi-user collaboration, third-party services (payments, email verification), console error monitoring, global setup/teardown, test annotations (skip, fixme, slow), test tags (@smoke, @fast, @critical, filtering with --grep), project dependencies, security testing (XSS, CSRF, auth), performance budgets (Web Vitals, Lighthouse), iframes, component testing, canvas/WebGL, service workers/PWA, test coverage, i18n/localization, Electron apps, or browser extension testing. Covers E2E, component, API, visual, accessibility, security, Electron, and extension testing.
license: MIT
metadata:
  author: currents.dev
  version: "1.1"
---

# Playwright Best Practices

This skill provides comprehensive guidance for all aspects of Playwright test development, from writing new tests to debugging and maintaining existing test suites.

## Framework Architecture

This skill targets a **layered, convention-driven framework**. Each layer only calls the
layer below it:

```
tests/          → scenarios only; use fixtures + asserts. No direct page/locator calls
assistants/     → multi-step, cross-page workflows (login, checkout); each public
                  method `@step`-decorated so actions nest under one named parent
asserts/        → verification helpers wrapping expect() in test.step ("ASSERT ...")
pages/          → page objects: locators only (extend BasePage, set PAGE_NAME)
components/     → reusable UI blocks (NavBar, Modal)
utils/Element   → Playwright Locator wrapper; every action auto-logs to test.step
utils/ElementFactory → builds Elements with consistent '[Page] "Name"' labels
utils/step      → @step method decorator: wraps an async method in a named test.step
                  (title: static string, omitted = method name, or resolver from call args)
fixtures/       → auto-registering DI container; exports `test` and `expect`
api/            → thin API clients (APIRequestContext) for arranging/cleaning state
config/         → URLs, credentials, storageState paths (from process.env)
```

### Critical conventions

- **Import `test` and `expect` from `fixtures/`, never from `@playwright/test`** in specs:
  `import { test, expect } from '../fixtures';`
- **Never call Playwright locator methods directly in tests or page objects.** Declare
  locators via the `this.el` factory on `BasePage` and act through the returned `Element`
  (which wraps every action in `test.step`). See [core/locators.md](core/locators.md).
- **Page objects hold locators only.** Behaviour lives in `assistants/`; verification lives
  in `asserts/`. See [core/page-object-model.md](core/page-object-model.md).
- **Report steps are hierarchical, one parent per orchestration method.** The `Element`
  layer auto-steps every individual action and `asserts/` helpers auto-step every
  verification (`ASSERT ...`). On top of that, **every public `assistants/` method is
  wrapped with the `@step` decorator** (`utils/step`) so its element actions nest *beneath*
  a single named parent in the report instead of appearing flat. Do **not** hand-roll
  `test.step` blocks inside method bodies, and do not step page objects/components (they hold
  locators only) — use the `@step` decorator on the orchestration method and let the
  `Element`/assert layers handle the leaves. See [core/annotations.md](core/annotations.md).
- **Use `asserts/` helpers (e.g. `CommonAsserts`) instead of raw `expect()` in tests** so
  reports show readable assertion names. See [core/assertions-waiting.md](core/assertions-waiting.md).
- **Adding a class to a barrel `index.ts` auto-creates its fixture** — no manual wiring.
  See [core/fixtures-hooks.md](core/fixtures-hooks.md).
- **Reporting is Allure-first.** See [infrastructure-ci-cd/reporting.md](infrastructure-ci-cd/reporting.md).

### Resolved conventions (see `decide.md` for rationale)

- **Test data**: split by responsibility — `config/` (`env.ts`, `testData.ts`) for
  environment, credentials, storageState paths, and fixed negative data; `helpers/`
  factories for entities a test **creates** (randomised per test). See [core/test-data.md](core/test-data.md).
- **Preconditions via API, not UI**: arrange state a test *depends on but does not exercise*
  (an existing account to log in with, seed data, a pre-filled cart) through a thin client in
  `api/` (`APIRequestContext`), exposed as a **fixture** that yields the arranged data and
  best-effort cleans up on teardown. Drive only the flow **under test** through the UI. This
  is faster and far less flaky than re-running an unrelated UI journey as setup. Rules: build
  the entity with the same `helpers/` factory (unique per run); assert the API outcome on the
  **response body**, not just HTTP status, when the service always returns `200`; never let a
  precondition fixture verify product behaviour — that belongs in `asserts/` inside the test.
  See [testing-patterns/api-testing.md](testing-patterns/api-testing.md),
  [architecture/when-to-mock.md](architecture/when-to-mock.md).
- **Timeouts**: centralised in `playwright.config.ts` (`actionTimeout`, `navigationTimeout`,
  `expect.timeout`); the `Element` wrapper carries **no** baked-in timeout defaults. See [core/assertions-waiting.md](core/assertions-waiting.md).
- **`BasePage`**: stays minimal (provides `el`; thin non-navigation readers only). Navigation
  lives in `assistants/`. See [core/page-object-model.md](core/page-object-model.md).
- **Component scoping**: page-level factory by default; container-`Locator` scope for
  repeated/nested blocks (table rows, cards). See [core/page-object-model.md](core/page-object-model.md).
- **Global chrome vs composition**: global UI (header `NavBar`, footer, generic dialogs)
  is **injected flat as its own fixture**, never composed into a page object — it is not
  owned by any single page, and nesting it duplicates the wiring across pages and implies
  ownership that does not exist. Reserve composition (`parentPage.block`) for fragments that
  are genuinely children of that page's container. See the section below.
- **Modals/dialogs**: treated as separate surfaces (portal-rendered), not page fragments —
  scoped by their own root, built on a shared `Dialog` shell, injected flat. See below.
- **Browser matrix**: projects partition by **site**; cross-browser is an extra axis enabled
  only in nightly/main via env. See [core/projects-dependencies.md](core/projects-dependencies.md).

## Global Chrome, Composition & Modals

Page-vs-component is a **naming signal** (has a URL vs. is a fragment), not a mechanical
difference: both are classes that declare locators via `el` and are injected the same way.
What actually drives maintainability is **flat injection vs. composition**, decided by
*ownership*, not by where an element happens to render.

### Global chrome → inject flat, never nest

Header `NavBar`, footer, breadcrumbs, generic toasts — UI that is identical across pages and
**owned by no single page**.

- Define its locators **once** in `components/`, register it in the components barrel, and
  inject it directly: `async ({ navBar }) => ...`.
- **Do not** compose it into a page object (`homePage.nav`). That implies the home page owns
  the nav (it does not), and forces you to repeat the `new NavBar(page)` wiring in every page
  that shows it — duplication of composition, just moved off the locators.
- The "duplication of locators" argument does **not** justify nesting: a flat-injected class
  also declares its locators exactly once.

```ts
// component (locators only)
class NavBar extends BasePage {
  protected readonly PAGE_NAME = 'NavBar';
  readonly loggedInAs = this.el('Logged in as', this.page.getByText('Logged in as'));
}
// test — flat, no `homePage.nav`
await commonAsserts.toContainText(navBar.loggedInAs, user.name);
```

Reserve composition (`parentPage.block`) for fragments that are **genuinely children of one
page's container** and benefit from container-`Locator` scoping (table rows, cards, a widget
that exists only on that page).

### Modals/dialogs → separate surfaces, not page fragments

Split a modal along **two independent axes**, not one:

1. **Shell** (overlay, title, confirm/cancel/close, open/closed waits) — almost always shared.
   Factor it into a single `Dialog` base. This is the highest-leverage decision.
2. **Content** (the fields/text inside) — sometimes global, sometimes feature-specific.

Rules:

- **Scope by the dialog's own root** (`getByRole('dialog', { name })`, `[aria-modal="true"]`,
  a stable `.modal` root) — **never** by a page container. Modals are usually portal-rendered
  at the end of `<body>`, so they are not in the page's DOM subtree; scoping to the page is
  both semantically and technically wrong.
- **Inject flat**, like global chrome — a modal is closer to a `page` (its own surface) than to
  a nested fragment.
- **Separate class only when the content is unique.** A plain confirm/message dialog needs no
  new class: reuse one generic `Dialog` and disambiguate by accessible name
  (`new Dialog(page, 'Delete account').confirm()`). Create a subclass that `extends Dialog`
  only to add feature-specific fields.
- **Trigger stays on the page/assistant; internals stay in the modal.** The button that opens
  the modal belongs to the page; the modal class never knows who opened it. Wait on
  open/closed with web-first assertions — no sleeps.

```ts
class Dialog {
  protected root = this.page.getByRole('dialog');
  constructor(protected page: Page, name?: string) {
    if (name) this.root = this.page.getByRole('dialog', { name });
  }
  confirm()    { return this.root.getByRole('button', { name: /yes|ok|confirm|delete/i }).click(); }
  cancel()     { return this.root.getByRole('button', { name: /no|cancel/i }).click(); }
  waitOpen()   { return expect(this.root).toBeVisible(); }
  waitClosed() { return expect(this.root).toBeHidden(); }
}
```

## Activity-Based Reference Guide

Consult these references based on what you're doing:

### Writing New Tests

**When to use**: Creating new test files, writing test cases, implementing test scenarios

| Activity                            | Reference Files                                                                                                                               |
| ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| **Writing E2E tests**               | [test-suite-structure.md](core/test-suite-structure.md), [locators.md](core/locators.md), [assertions-waiting.md](core/assertions-waiting.md) |
| **Writing component tests**         | [component-testing.md](testing-patterns/component-testing.md), [test-suite-structure.md](core/test-suite-structure.md)                        |
| **Writing API tests**               | [api-testing.md](testing-patterns/api-testing.md), [test-suite-structure.md](core/test-suite-structure.md)                                    |
| **Writing GraphQL tests**           | [graphql-testing.md](testing-patterns/graphql-testing.md), [api-testing.md](testing-patterns/api-testing.md)                                  |
| **Writing visual regression tests** | [visual-regression.md](testing-patterns/visual-regression.md), [canvas-webgl.md](testing-patterns/canvas-webgl.md)                            |
| **Structuring test code with POM**  | [page-object-model.md](core/page-object-model.md), [test-suite-structure.md](core/test-suite-structure.md)                                    |
| **Setting up test data/fixtures**   | [fixtures-hooks.md](core/fixtures-hooks.md), [test-data.md](core/test-data.md)                                                                |
| **Handling authentication**         | [authentication.md](advanced/authentication.md), [authentication-flows.md](advanced/authentication-flows.md)                                  |
| **Testing date/time features**      | [clock-mocking.md](advanced/clock-mocking.md)                                                                                                 |
| **Testing file upload/download**    | [file-operations.md](testing-patterns/file-operations.md), [file-upload-download.md](testing-patterns/file-upload-download.md)                |
| **Testing forms/validation**        | [forms-validation.md](testing-patterns/forms-validation.md)                                                                                   |
| **Testing drag and drop**           | [drag-drop.md](testing-patterns/drag-drop.md)                                                                                                 |
| **Testing accessibility**           | [accessibility.md](testing-patterns/accessibility.md)                                                                                         |
| **Testing security (XSS, CSRF)**    | [security-testing.md](testing-patterns/security-testing.md)                                                                                   |
| **Using test annotations**          | [annotations.md](core/annotations.md)                                                                                                         |
| **Using test tags**                 | [test-tags.md](core/test-tags.md)                                                                                                             |
| **Testing iframes**                 | [iframes.md](browser-apis/iframes.md)                                                                                                         |
| **Testing canvas/WebGL**            | [canvas-webgl.md](testing-patterns/canvas-webgl.md)                                                                                           |
| **Internationalization (i18n)**     | [i18n.md](testing-patterns/i18n.md)                                                                                                           |
| **Testing Electron apps**           | [electron.md](testing-patterns/electron.md)                                                                                                   |
| **Testing browser extensions**      | [browser-extensions.md](testing-patterns/browser-extensions.md)                                                                               |

### Mobile & Responsive Testing

**When to use**: Testing mobile devices, touch interactions, responsive layouts

| Activity                        | Reference Files                                                                  |
| ------------------------------- | -------------------------------------------------------------------------------- |
| **Device emulation**            | [mobile-testing.md](advanced/mobile-testing.md)                                  |
| **Touch gestures (swipe, tap)** | [mobile-testing.md](advanced/mobile-testing.md)                                  |
| **Viewport/breakpoint testing** | [mobile-testing.md](advanced/mobile-testing.md)                                  |
| **Mobile-specific UI**          | [mobile-testing.md](advanced/mobile-testing.md), [locators.md](core/locators.md) |

### Real-Time & Browser APIs

**When to use**: Testing WebSockets, geolocation, permissions, multi-tab flows

| Activity                        | Reference Files                                                                          |
| ------------------------------- | ---------------------------------------------------------------------------------------- |
| **WebSocket/real-time testing** | [websockets.md](browser-apis/websockets.md)                                              |
| **Geolocation mocking**         | [browser-apis.md](browser-apis/browser-apis.md)                                          |
| **Permission handling**         | [browser-apis.md](browser-apis/browser-apis.md)                                          |
| **Clipboard testing**           | [browser-apis.md](browser-apis/browser-apis.md)                                          |
| **Camera/microphone mocking**   | [browser-apis.md](browser-apis/browser-apis.md)                                          |
| **Multi-tab/popup flows**       | [multi-context.md](advanced/multi-context.md)                                            |
| **OAuth popup handling**        | [third-party.md](advanced/third-party.md), [multi-context.md](advanced/multi-context.md) |

### Debugging & Troubleshooting

**When to use**: Test failures, element not found, timeouts, unexpected behavior

| Activity                                          | Reference Files                                                                                                                                |
| ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| **Debugging test failures**                       | [debugging.md](debugging/debugging.md), [assertions-waiting.md](core/assertions-waiting.md)                                                    |
| **Fixing flaky tests**                            | [flaky-tests.md](debugging/flaky-tests.md), [debugging.md](debugging/debugging.md), [assertions-waiting.md](core/assertions-waiting.md)        |
| **Debugging flaky parallel runs**                 | [flaky-tests.md](debugging/flaky-tests.md), [performance.md](infrastructure-ci-cd/performance.md), [fixtures-hooks.md](core/fixtures-hooks.md) |
| **Ensuring test isolation / avoiding state leak** | [flaky-tests.md](debugging/flaky-tests.md), [fixtures-hooks.md](core/fixtures-hooks.md), [performance.md](infrastructure-ci-cd/performance.md) |
| **Fixing selector issues**                        | [locators.md](core/locators.md), [debugging.md](debugging/debugging.md)                                                                        |
| **Investigating timeout issues**                  | [assertions-waiting.md](core/assertions-waiting.md), [debugging.md](debugging/debugging.md)                                                    |
| **Using trace viewer**                            | [debugging.md](debugging/debugging.md)                                                                                                         |
| **Debugging race conditions**                     | [flaky-tests.md](debugging/flaky-tests.md), [debugging.md](debugging/debugging.md), [assertions-waiting.md](core/assertions-waiting.md)        |
| **Debugging console/JS errors**                   | [console-errors.md](debugging/console-errors.md), [debugging.md](debugging/debugging.md)                                                       |

### Error & Edge Case Testing

**When to use**: Testing error states, offline mode, network failures, validation

| Activity                       | Reference Files                                                                                       |
| ------------------------------ | ----------------------------------------------------------------------------------------------------- |
| **Error boundary testing**     | [error-testing.md](debugging/error-testing.md)                                                        |
| **Network failure simulation** | [error-testing.md](debugging/error-testing.md), [network-advanced.md](advanced/network-advanced.md)   |
| **Offline mode testing**       | [error-testing.md](debugging/error-testing.md), [service-workers.md](browser-apis/service-workers.md) |
| **Service worker testing**     | [service-workers.md](browser-apis/service-workers.md)                                                 |
| **Loading state testing**      | [error-testing.md](debugging/error-testing.md)                                                        |
| **Form validation testing**    | [error-testing.md](debugging/error-testing.md)                                                        |

### Multi-User & Collaboration Testing

**When to use**: Testing features involving multiple users, roles, or real-time collaboration

| Activity                       | Reference Files                                                                      |
| ------------------------------ | ------------------------------------------------------------------------------------ |
| **Multiple users in one test** | [multi-user.md](advanced/multi-user.md)                                              |
| **Real-time collaboration**    | [multi-user.md](advanced/multi-user.md), [websockets.md](browser-apis/websockets.md) |
| **Role-based access testing**  | [multi-user.md](advanced/multi-user.md)                                              |
| **Concurrent action testing**  | [multi-user.md](advanced/multi-user.md)                                              |

### Architecture Decisions

**When to use**: Choosing test patterns, deciding between approaches, planning test architecture

| Activity                     | Reference Files                                           |
| ---------------------------- | --------------------------------------------------------- |
| **POM vs fixtures decision** | [pom-vs-fixtures.md](architecture/pom-vs-fixtures.md)     |
| **Test type selection**      | [test-architecture.md](architecture/test-architecture.md) |
| **Mock vs real services**    | [when-to-mock.md](architecture/when-to-mock.md)           |
| **Test suite structure**     | [test-suite-structure.md](core/test-suite-structure.md)   |

### Framework-Specific Testing

**When to use**: Testing React, Angular, Vue, or Next.js applications

| Activity                  | Reference Files                     |
| ------------------------- | ----------------------------------- |
| **Testing React apps**    | [react.md](frameworks/react.md)     |
| **Testing Angular apps**  | [angular.md](frameworks/angular.md) |
| **Testing Vue/Nuxt apps** | [vue.md](frameworks/vue.md)         |
| **Testing Next.js apps**  | [nextjs.md](frameworks/nextjs.md)   |

### Refactoring & Maintenance

**When to use**: Improving existing tests, code review, reducing duplication

| Activity                             | Reference Files                                                                                            |
| ------------------------------------ | ---------------------------------------------------------------------------------------------------------- |
| **Refactoring to Page Object Model** | [page-object-model.md](core/page-object-model.md), [test-suite-structure.md](core/test-suite-structure.md) |
| **Improving test organization**      | [test-suite-structure.md](core/test-suite-structure.md), [page-object-model.md](core/page-object-model.md) |
| **Extracting common setup/teardown** | [fixtures-hooks.md](core/fixtures-hooks.md)                                                                |
| **Replacing brittle selectors**      | [locators.md](core/locators.md)                                                                            |
| **Removing explicit waits**          | [assertions-waiting.md](core/assertions-waiting.md)                                                        |
| **Creating test data factories**     | [test-data.md](core/test-data.md)                                                                          |
| **Configuration setup**              | [configuration.md](core/configuration.md)                                                                  |

### Infrastructure & Configuration

**When to use**: Setting up projects, configuring CI/CD, optimizing performance

| Activity                                | Reference Files                                                                                                          |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| **Configuring Playwright project**      | [configuration.md](core/configuration.md), [projects-dependencies.md](core/projects-dependencies.md)                     |
| **Setting up CI/CD pipelines**          | [ci-cd.md](infrastructure-ci-cd/ci-cd.md), [github-actions.md](infrastructure-ci-cd/github-actions.md)                   |
| **GitHub Actions setup**                | [github-actions.md](infrastructure-ci-cd/github-actions.md)                                                              |
| **GitLab CI setup**                     | [gitlab.md](infrastructure-ci-cd/gitlab.md)                                                                              |
| **Other CI providers**                  | [other-providers.md](infrastructure-ci-cd/other-providers.md)                                                            |
| **Docker/container setup**              | [docker.md](infrastructure-ci-cd/docker.md)                                                                              |
| **Global setup & teardown**             | [global-setup.md](core/global-setup.md)                                                                                  |
| **Project dependencies**                | [projects-dependencies.md](core/projects-dependencies.md)                                                                |
| **Optimizing test performance**         | [performance.md](infrastructure-ci-cd/performance.md), [test-suite-structure.md](core/test-suite-structure.md)           |
| **Configuring parallel execution**      | [parallel-sharding.md](infrastructure-ci-cd/parallel-sharding.md), [performance.md](infrastructure-ci-cd/performance.md) |
| **Isolating test data between workers** | [fixtures-hooks.md](core/fixtures-hooks.md), [performance.md](infrastructure-ci-cd/performance.md)                       |
| **Test coverage**                       | [test-coverage.md](infrastructure-ci-cd/test-coverage.md)                                                                |
| **Test reporting/artifacts**            | [reporting.md](infrastructure-ci-cd/reporting.md)                                                                        |

### Advanced Patterns

**When to use**: Complex scenarios, API mocking, network interception

| Activity                             | Reference Files                                                                                              |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------ |
| **Mocking API responses**            | [test-suite-structure.md](core/test-suite-structure.md), [network-advanced.md](advanced/network-advanced.md) |
| **Network interception**             | [network-advanced.md](advanced/network-advanced.md), [assertions-waiting.md](core/assertions-waiting.md)     |
| **GraphQL mocking**                  | [network-advanced.md](advanced/network-advanced.md)                                                          |
| **HAR recording/playback**           | [network-advanced.md](advanced/network-advanced.md)                                                          |
| **Custom fixtures**                  | [fixtures-hooks.md](core/fixtures-hooks.md)                                                                  |
| **Advanced waiting strategies**      | [assertions-waiting.md](core/assertions-waiting.md)                                                          |
| **OAuth/SSO mocking**                | [third-party.md](advanced/third-party.md), [multi-context.md](advanced/multi-context.md)                     |
| **Payment gateway mocking**          | [third-party.md](advanced/third-party.md)                                                                    |
| **Email/SMS verification mocking**   | [third-party.md](advanced/third-party.md)                                                                    |
| **Failing on console errors**        | [console-errors.md](debugging/console-errors.md)                                                             |
| **Security testing (XSS, CSRF)**     | [security-testing.md](testing-patterns/security-testing.md)                                                  |
| **Performance budgets & Web Vitals** | [performance-testing.md](testing-patterns/performance-testing.md)                                            |
| **Lighthouse integration**           | [performance-testing.md](testing-patterns/performance-testing.md)                                            |
| **Test annotations (skip, fixme)**   | [annotations.md](core/annotations.md)                                                                        |
| **Test tags (@smoke, @fast)**        | [test-tags.md](core/test-tags.md)                                                                            |
| **Test steps for reporting**         | [annotations.md](core/annotations.md)                                                                        |

## Quick Decision Tree

```
What are you doing?
│
├─ Writing a new test?
│  ├─ E2E test → core/test-suite-structure.md, core/locators.md, core/assertions-waiting.md
│  ├─ Component test → testing-patterns/component-testing.md
│  ├─ API test → testing-patterns/api-testing.md, core/test-suite-structure.md
│  ├─ GraphQL test → testing-patterns/graphql-testing.md
│  ├─ Visual regression → testing-patterns/visual-regression.md
│  ├─ Visual/canvas test → testing-patterns/canvas-webgl.md, core/test-suite-structure.md
│  ├─ Accessibility test → testing-patterns/accessibility.md
│  ├─ Mobile/responsive test → advanced/mobile-testing.md
│  ├─ i18n/locale test → testing-patterns/i18n.md
│  ├─ Electron app test → testing-patterns/electron.md
│  ├─ Browser extension test → testing-patterns/browser-extensions.md
│  ├─ Multi-user test → advanced/multi-user.md
│  ├─ Form validation test → testing-patterns/forms-validation.md
│  └─ Drag and drop test → testing-patterns/drag-drop.md
│
├─ Testing specific features?
│  ├─ File upload/download → testing-patterns/file-operations.md, testing-patterns/file-upload-download.md
│  ├─ Date/time dependent → advanced/clock-mocking.md
│  ├─ WebSocket/real-time → browser-apis/websockets.md
│  ├─ Geolocation/permissions → browser-apis/browser-apis.md
│  ├─ OAuth/SSO mocking → advanced/third-party.md, advanced/multi-context.md
│  ├─ Payments/email/SMS → advanced/third-party.md
│  ├─ iFrames → browser-apis/iframes.md
│  ├─ Canvas/WebGL/charts → testing-patterns/canvas-webgl.md
│  ├─ Service workers/PWA → browser-apis/service-workers.md
│  ├─ i18n/localization → testing-patterns/i18n.md
│  ├─ Security (XSS, CSRF) → testing-patterns/security-testing.md
│  └─ Performance/Web Vitals → testing-patterns/performance-testing.md
│
├─ Architecture decisions?
│  ├─ POM vs fixtures → architecture/pom-vs-fixtures.md
│  ├─ Test type selection → architecture/test-architecture.md
│  ├─ Mock vs real services → architecture/when-to-mock.md
│  └─ Test suite structure → core/test-suite-structure.md
│
├─ Framework-specific testing?
│  ├─ React app → frameworks/react.md
│  ├─ Angular app → frameworks/angular.md
│  ├─ Vue/Nuxt app → frameworks/vue.md
│  └─ Next.js app → frameworks/nextjs.md
│
├─ Authentication testing?
│  ├─ Basic auth patterns → advanced/authentication.md
│  └─ Complex flows (MFA, reset) → advanced/authentication-flows.md
│
├─ Test is failing/flaky?
│  ├─ Flaky test investigation → debugging/flaky-tests.md
│  ├─ Element not found → core/locators.md, debugging/debugging.md
│  ├─ Timeout issues → core/assertions-waiting.md, debugging/debugging.md
│  ├─ Race conditions → debugging/flaky-tests.md, debugging/debugging.md
│  ├─ Flaky only with multiple workers → debugging/flaky-tests.md, infrastructure-ci-cd/performance.md
│  ├─ State leak / isolation → debugging/flaky-tests.md, core/fixtures-hooks.md
│  ├─ Console/JS errors → debugging/console-errors.md, debugging/debugging.md
│  └─ General debugging → debugging/debugging.md
│
├─ Testing error scenarios?
│  ├─ Network failures → debugging/error-testing.md, advanced/network-advanced.md
│  ├─ Offline (unexpected) → debugging/error-testing.md
│  ├─ Offline-first/PWA → browser-apis/service-workers.md
│  ├─ Error boundaries → debugging/error-testing.md
│  └─ Form validation → testing-patterns/forms-validation.md, debugging/error-testing.md
│
├─ Refactoring existing code?
│  ├─ Implementing POM → core/page-object-model.md
│  ├─ Improving selectors → core/locators.md
│  ├─ Extracting fixtures → core/fixtures-hooks.md
│  ├─ Creating data factories → core/test-data.md
│  └─ Configuration setup → core/configuration.md
│
├─ Setting up infrastructure?
│  ├─ CI/CD → infrastructure-ci-cd/ci-cd.md
│  ├─ GitHub Actions → infrastructure-ci-cd/github-actions.md
│  ├─ GitLab CI → infrastructure-ci-cd/gitlab.md
│  ├─ Other CI providers → infrastructure-ci-cd/other-providers.md
│  ├─ Docker/containers → infrastructure-ci-cd/docker.md
│  ├─ Sharding/parallel → infrastructure-ci-cd/parallel-sharding.md
│  ├─ Reporting/artifacts → infrastructure-ci-cd/reporting.md
│  ├─ Global setup/teardown → core/global-setup.md
│  ├─ Project dependencies → core/projects-dependencies.md
│  ├─ Test performance → infrastructure-ci-cd/performance.md
│  ├─ Test coverage → infrastructure-ci-cd/test-coverage.md
│  └─ Project config → core/configuration.md, core/projects-dependencies.md
│
├─ Organizing tests?
│  ├─ Skip/fixme/slow tests → core/annotations.md
│  ├─ Test tags (@smoke, @fast) → core/test-tags.md
│  ├─ Filtering tests (--grep) → core/test-tags.md
│  ├─ Test steps → core/annotations.md
│  └─ Conditional execution → core/annotations.md
│
└─ Running subset of tests?
   ├─ By tag (@smoke, @critical) → core/test-tags.md
   ├─ Exclude slow/flaky tests → core/test-tags.md
   ├─ PR vs nightly tests → core/test-tags.md, infrastructure-ci-cd/ci-cd.md
   └─ Project-specific filtering → core/test-tags.md, core/configuration.md
```

## Test Validation Loop

After writing or modifying tests:

1. **Run tests**: `npx playwright test`
2. **If tests fail**:
   - Review error output and trace (`npx playwright show-trace`)
   - Fix locators, waits, or assertions
   - Re-run tests
3. **Only proceed when all tests pass**
4. **Run multiple times** for critical tests: `npx playwright test --repeat-each=5`

> **Do not pass `--reporter=` on the CLI** — it overrides the reporter list in
> `playwright.config.ts` and disables Allure. If you need a one-off reporter, add it to the
> `reporter` array in the config instead.
