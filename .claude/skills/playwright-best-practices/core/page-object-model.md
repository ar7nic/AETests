# Page Object Model (POM)

## Table of Contents

1. [Overview](#overview)
2. [Page Class (locators only)](#page-class-locators-only)
3. [Assistants (behaviour layer)](#assistants-behaviour-layer)
4. [Usage in Tests](#usage-in-tests)
5. [Component Objects](#component-objects)
6. [Composition Patterns](#composition-patterns)
7. [Factory Functions](#factory-functions)
8. [Best Practices](#best-practices)

## Overview

This framework splits the classic Page Object into focused layers:

- **`pages/`** — page objects that hold **locators only** (declared via the `this.el`
  factory). One class per logical page; no actions, no assertions.
- **`assistants/`** — multi-step, cross-page **workflows** (login, checkout) that drive the
  pages. This is where behaviour lives.
- **`asserts/`** — verification helpers (see [assertions-waiting.md](assertions-waiting.md)).

This keeps each piece single-responsibility: selectors are isolated from flows, flows are
isolated from assertions, and reports stay readable because every layer logs to `test.step`
automatically.

## Page Class (locators only)

A page extends `BasePage`, sets `PAGE_NAME`, and exposes locators as `readonly` field
initialisers declared through `this.el(name, locator)` (see [locators.md](locators.md)). It
contains **no flow methods and no `expect`** — those belong in assistants and asserts
respectively.

```typescript
// pages/LoginPage.ts
import { BasePage } from './BasePage';
import type { Element } from '../utils';

export class LoginPage extends BasePage {
  protected readonly PAGE_NAME = 'Login';

  readonly loginEmail: Element = this.el('Login email', this.page.getByTestId('login-email'));
  readonly loginPassword: Element = this.el(
    'Login password',
    this.page.getByTestId('login-password'),
  );
  readonly loginButton: Element = this.el(
    'Login button',
    this.page.getByRole('button', { name: 'Login' }),
  );
}
```

`BasePage` provides the `el` method (and the `frame` helper for iframe-scoped locators) bound
to `PAGE_NAME` (reference: `pages/BasePage.ts`):

```typescript
export abstract class BasePage {
  protected abstract readonly PAGE_NAME: string;
  private readonly factory = new ElementFactory(() => this.PAGE_NAME);

  constructor(protected readonly page: Page) {}

  protected el(name: string, locator: Locator): Element {
    return this.factory.create(name, locator);
  }

  protected frame(selector: string): FrameLocator {
    return this.page.frameLocator(selector);
  }
}
```

> **Keep `BasePage` minimal.** Its job is to provide `el`/`frame`. Thin, **non-navigation**
> readers (e.g. `getTitle()`) may be added if widely reused, but **navigation and flows stay
> in `assistants/`** — don't add an `abstract goto()` or other behaviour to the base class.

## Assistants (behaviour layer)

Assistants encapsulate the multi-step flows that used to live as methods on page objects.
Each assistant takes the raw `page: Page` in its constructor and instantiates the page
objects/components it drives directly — there is no shared per-test dependency container to
read them from. Each public method is one logical flow, and is wrapped with the `@step`
decorator (`utils/step`) rather than a hand-rolled `test.step` call, so the element-level
steps performed inside it nest under one named parent in the report.

```typescript
// assistants/LoginAssistant.ts
import type { Page } from '@playwright/test';
import { LoginPage } from '../pages';
import { step } from '../utils';
import type { UserCredentials } from '../helpers';
import { BaseAuthAssistant } from './BaseAuthAssistant';

export class LoginAssistant extends BaseAuthAssistant {
  private readonly loginPage: LoginPage;

  constructor(page: Page) {
    super(page);
    this.loginPage = new LoginPage(page);
  }

  @step('Log in with email and password')
  async login(credentials: UserCredentials): Promise<void> {
    await this.loginPage.loginEmail.fill(credentials.email);
    await this.loginPage.loginPassword.fill(credentials.password);
    await this.loginPage.loginButton.click();
  }
}
```

> `@step(...)` wraps the **whole method** (it groups the auto-logged `Element` steps
> underneath one named parent). Do **not** additionally hand-roll `test.step` calls inside the
> method body. See [annotations.md](annotations.md).

### Trimming assistant boilerplate

A base assistant can factor out steps shared by multiple concrete assistants (e.g. navigation
common to both the login and registration journeys). It still just takes `page: Page` and
builds its own page/component instances — there's no dependency container to extend:

```typescript
// assistants/BaseAuthAssistant.ts
import type { Page } from '@playwright/test';
import { AccountDeletedPage } from '../pages';
import { NavBar } from '../components';
import { step } from '../utils';

export abstract class BaseAuthAssistant {
  protected readonly navBar: NavBar;
  protected readonly accountDeleted: AccountDeletedPage;

  constructor(protected readonly page: Page) {
    this.navBar = new NavBar(page);
    this.accountDeleted = new AccountDeletedPage(page);
  }

  @step('Open the home page')
  async openHomePage(): Promise<void> {
    await this.page.goto('/');
  }

  @step('Go to Signup / Login')
  async goToSignupLogin(): Promise<void> {
    await this.navBar.signupLoginLink.click();
  }
}
```

Concrete assistants (`LoginAssistant`, `RegistrationAssistant`, …) `extend` it and add their
own flow-specific methods, as shown above. `BaseAuthAssistant` itself is **not** registered as
a fixture (it's abstract) — only its concrete subclasses are, via the `assistants/` barrel.

## Usage in Tests

Tests import `test`/`expect` from `fixtures/`, request the assistants/pages/asserts they
need as fixtures, and never touch raw locators or `expect`:

```typescript
// tests/login-user.spec.ts
import { test } from '../fixtures';
import { testUser } from '../config';

test.describe('Test Case 2: Login User with correct email and password', () => {
  test('logs in with valid credentials then deletes the account @smoke @critical', async ({
    loginAssistant,
    commonAsserts,
    navBar,
    accountDeletedPage,
    registeredUser,
  }) => {
    await loginAssistant.openHomePage();
    await loginAssistant.goToSignupLogin();
    await loginAssistant.login(registeredUser);
    await commonAsserts.toContainText(navBar.loggedInAs, testUser.name);
    await loginAssistant.deleteAccount();
    await commonAsserts.toBeVisible(accountDeletedPage.heading);
  });
});
```

## Component Objects

Reusable UI blocks (`NavBar`) live in `components/`. Mechanically they are built the exact
same way as a page object — they `extend BasePage`, set `PAGE_NAME`, and declare locators via
`this.el` — the `pages/` vs `components/` split is a **naming signal** (has a URL vs. is a
fragment shown across pages), not a different base class or factory.

```typescript
// components/NavBar.ts
import { BasePage } from '../pages/BasePage';
import type { Element } from '../utils';

export class NavBar extends BasePage {
  protected readonly PAGE_NAME = 'NavBar';

  readonly signupLoginLink: Element = this.el(
    'Signup / Login link',
    this.page.getByRole('link', { name: 'Signup / Login' }),
  );

  readonly loggedInAs: Element = this.el(
    'Logged in as indicator',
    this.page.getByText('Logged in as'),
  );
}
```

Unlike pages, components hold **only** locators too — this framework keeps behaviour out of
`components/` as well, in assistants. A navbar's "log out" click, for example, is driven from
an assistant (`navBar.logoutLink.click()`), not from a `logout()` method on `NavBar` itself.
If a future component genuinely needs a small self-contained interaction that never crosses
pages, that's a deliberate exception to raise with the team rather than a default.

### Component scoping (recommended)

Use a **hybrid** rule, decided by *ownership* rather than where the element happens to render:

- **Global chrome, owned by no single page** (`NavBar`, footer, generic dialogs) — build
  page-level via `this.el` (as above) and **inject it flat as its own fixture**. Never compose
  it into a page object (no `homePage.navBar`) — that implies the page owns the nav, which it
  does not, and forces re-wiring `new NavBar(page)` into every page that shows it.
- **Repeated / nested blocks genuinely owned by one page's container** (a table row, a card in
  a list) — scope to a parent container `Locator` so selectors are constrained to that
  subtree, and build them from a method that returns a freshly labelled `Element`:

```typescript
// pages/DashboardPage.ts (excerpt) — repeated block scoped to its container row
userRow(name: string) {
  return this.el(`Row "${name}"`, this.page.getByRole('row').filter({ hasText: name }));
}
```

**Modals/dialogs** follow the same "inject flat" rule as global chrome, but are scoped by
their own root (`getByRole('dialog', { name })`), not by a page container — they are typically
portal-rendered outside the page's DOM subtree, so scoping them to a page would be wrong even
if it worked by accident.

## Composition Patterns

### Assistants compose pages and components, not the other way around

Because global chrome is injected flat, a page object does **not** expose a component getter
(no `dashboardPage.navBar`) — an assistant instantiates and drives both directly, the same way
`BaseAuthAssistant` builds its own `NavBar` and `AccountDeletedPage` instances (see
[Assistants](#assistants-behaviour-layer) above):

```typescript
// assistants/BaseAuthAssistant.ts (excerpt)
constructor(protected readonly page: Page) {
  this.navBar = new NavBar(page);
  this.accountDeleted = new AccountDeletedPage(page);
}

@step('Delete account')
async deleteAccount(): Promise<void> {
  await this.navBar.deleteAccountLink.click();
}
```

Reserve composition (`parentPage.block`) for fragments that are genuinely children of one
page's own container (see [Component scoping](#component-scoping-recommended) above).

### Cross-page navigation

Navigation that spans pages belongs in an **assistant**, not in a page method that returns
another page object. The assistant drives the source page's locators, waits, then drives the
destination page — see the `login`/`goToSignupLogin`/`deleteAccount` methods on
`LoginAssistant`/`BaseAuthAssistant` above.

## Factory Functions

`ElementFactory` (`utils/ElementFactory.ts`) is the factory pattern this framework uses — for
**locators**, not whole pages. Page objects themselves are plain classes extending `BasePage`;
each fixture in `fixtures/index.ts` instantiates its class directly (`new Ctor(page)`) when
requested by a test, so there is no need for hand-written page factory functions.

## Best Practices

### Do

- **Keep pages/components locator-only** — declared via `this.el`; selectors are the single
  source of truth
- **Put multi-step flows in `assistants/`** and verification in `asserts/`
- **Give every locator a human name** (first argument to `this.el`) — it drives report steps
- **Inject global chrome and modals flat**, never composed into a page object
- **Register classes via barrels** so fixtures are wired automatically

### Don't

- **Don't add flow methods or `expect` to page objects/components** — use assistants / asserts
- **Don't call Playwright locators directly** — always go through `this.el` / `Element`
- **Don't add manual `test.step` in pages/components** — the `Element` wrapper logs already;
  use `@step` on the assistant's orchestration method instead
- **Don't compose a page object to reach global chrome** (`homePage.navBar`) — inject it flat
  as its own fixture and drive it from an assistant

### Directory Structure

```
tests/          # specs only (import { test } from '../fixtures')
assistants/     # LoginAssistant.ts, BaseAuthAssistant.ts, ... + index.ts (barrel)
asserts/        # CommonAsserts.ts, ...                         + index.ts (barrel)
pages/          # BasePage.ts, LoginPage.ts, HomePage.ts, ...   + index.ts (barrel)
components/     # NavBar.ts, ...                                + index.ts (barrel)
fixtures/       # index.ts (auto-registering DI container)
utils/          # Element.ts, ElementFactory.ts, step.ts
config/         # env.ts, testData.ts
playwright.config.ts
```

See [test-suite-structure.md](test-suite-structure.md) for naming and barrel conventions.

### Using with Fixtures

Pages, components, assistants, and asserts are **auto-registered** as fixtures from their
barrels — you do not write per-page `test.extend()` blocks. Just request them by their
camelCase name (the object key each barrel gives it — see
[fixtures-hooks.md](fixtures-hooks.md)):

```typescript
import { test } from '../fixtures';

test('can login', async ({ authAssistant, commonAsserts }) => {
  await authAssistant.loginAndWaitForDashboard('tomsmith', 'SuperSecretPassword!');
  await commonAsserts.urlMatches(/.*\/secure/);
});
```

See [fixtures-hooks.md](fixtures-hooks.md) for how the container builds these.

## Related References

- **Locator strategies**: See [locators.md](locators.md) for selecting elements
- **Fixtures**: See [fixtures-hooks.md](fixtures-hooks.md) for advanced fixture patterns
- **Test organization**: See [test-suite-structure.md](test-suite-structure.md) for structuring test suites
