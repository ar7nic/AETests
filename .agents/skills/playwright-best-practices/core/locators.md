# Locator Strategies

## Table of Contents

1. [Declaring Locators: Element & ElementFactory](#declaring-locators-element--elementfactory)
2. [Priority Order](#priority-order)
3. [User-Facing Locators](#user-facing-locators)
4. [Filtering & Chaining](#filtering--chaining)
5. [Dynamic Content](#dynamic-content)
6. [Shadow DOM](#shadow-dom)
7. [Iframes](#iframes)

## Declaring Locators: Element & ElementFactory

In this framework you **never call Playwright locator methods directly in a test or
component/assistant body**. Locators are declared once, as field initialisers, on a page
object or component via the `this.el(name, locator)` helper (provided by `BasePage`) and used
through the returned **`Element`** wrapper. `this.el` builds the locator by calling the normal
Playwright locator APIs (`getByRole`, `getByTestId`, `getByText`, `locator(css)`, …) yourself —
it does not have its own `byRole`/`byTestId`/`byLabel` builder methods; it only attaches the
human-readable label and wraps the result in an `Element`. The `Element` wraps every action in
`test.step`, so each interaction auto-logs as `[PageName] "Element name" → action` in
Allure/HTML reports.

The `getByRole` / `getByLabel` / etc. [priority order](#priority-order) below still applies —
you choose the underlying Playwright locator strategy yourself when calling `this.el`.

### Declaring locators (in a page object / component)

```typescript
export class LoginPage extends BasePage {
  protected readonly PAGE_NAME = 'Login';

  // this.page.getBy*() picks the strategy (role/label/text/testid/css); this.el just labels it.
  readonly loginToYourAccountHeading = this.el(
    'Login to your account heading',
    this.page.getByRole('heading', { name: 'Login to your account' }),
  );

  readonly loginEmail = this.el('Login email', this.page.getByTestId('login-email'));

  readonly loginButton = this.el(
    'Login button',
    this.page.getByRole('button', { name: 'Login' }),
  );

  // dynamic/filtered locators are still built the normal Playwright way, then labelled:
  userRow(name: string) {
    return this.el(`Row "${name}"`, this.page.getByRole('row').filter({ hasText: name }));
  }
}
```

`BasePage.el` (reference implementation: `pages/BasePage.ts`, `utils/ElementFactory.ts`):

```typescript
protected el(name: string, locator: Locator): Element {
  return this.factory.create(name, locator); // -> `[${this.PAGE_NAME}] "${name}"`
}
```

For locators inside an `<iframe>`, use the sibling `this.frame(selector)` helper (also on
`BasePage`) to get a `FrameLocator`, then chain any locator strategy off it before passing the
result to `this.el`:

```typescript
readonly cardNumber = this.el(
  'Card number',
  this.frame('#checkout').getByRole('textbox', { name: 'Card number' }),
);
```

### Acting through Element

```typescript
await loginPage.loginButton.click();   // step: [Login] "Login button" → click
await loginPage.loginEmail.fill('tomsmith@example.com');

// dynamic locators are declared as a method returning a fresh, named Element:
await page.userRow('Alice').click();
```

The `Element` wrapper (reference implementation: `utils/Element.ts`) exposes the actions
`click`, `fill`, `check`, `uncheck`, `selectOption`, `hover`, `scrollIntoView`, and the reader
`innerText` — each auto-stepped. It intentionally does **not** expose chaining helpers
(`nth`, `find`, `withText`, …) or `count`/`isVisible`/`waitFor`: build the exact locator you
need with plain Playwright APIs (`.filter()`, `.nth()`, `.first()`, …) *before* handing it to
`this.el`, so the label stays attached to one concrete, named target. If a page needs a new
action or reader that isn't on `Element` yet, add it there (it will auto-step like the rest) —
don't reach for `element.locator` inside a page/component to bypass it. `element.locator` and
`element.label` are exposed read-only, used by the `asserts/` layer to run `expect()` — see
[assertions-waiting.md](assertions-waiting.md).

> **Timeouts are centralised, not baked into `Element`.** Action methods do **not** carry
> hard-coded timeout defaults — base timing comes from `actionTimeout` /
> `navigationTimeout` / `expect.timeout` in `playwright.config.ts`. Methods still accept an
> optional `timeout` argument for the rare slow case. See
> [configuration.md](configuration.md) and `decide.md` (item 12).

## Priority Order

Use locators in this order of preference:

1. **Role-based** (most resilient): `getByRole`
2. **Label-based**: `getByLabel`, `getByPlaceholder`
3. **Text-based**: `getByText`, `getByTitle`
4. **Test IDs** (when semantic locators aren't possible): `getByTestId`
5. **CSS/XPath** (last resort): `locator('css=...')`, `locator('xpath=...')`

## User-Facing Locators

### getByRole

Most robust approach - matches how users and assistive technology perceive the page.

```typescript
// Buttons
page.getByRole("button", { name: "Submit", exact: true }); // exact accessible name
page.getByRole("button", { name: /submit/i }); // flexible case-insensitive match

// Links
page.getByRole("link", { name: "Home" });

// Form elements
page.getByRole("textbox", { name: "Email" });
page.getByRole("checkbox", { name: "Remember me" });
page.getByRole("combobox", { name: "Country" });
page.getByRole("radio", { name: "Option A" });

// Headings
page.getByRole("heading", { name: "Welcome", level: 1 });

// Lists & items
page.getByRole("list").getByRole("listitem");

// Navigation & regions
page.getByRole("navigation");
page.getByRole("main");
page.getByRole("dialog");
page.getByRole("alert");
```

### getByLabel

For form elements with associated labels.

```typescript
// Input with <label for="email">
page.getByLabel("Email address");

// Input with aria-label
page.getByLabel("Search");

// Exact match
page.getByLabel("Email", { exact: true });
```

### getByPlaceholder

```typescript
page.getByPlaceholder("Enter your email");
page.getByPlaceholder(/email/i);
```

### getByText

```typescript
// Partial match (default)
page.getByText("Welcome");

// Exact match
page.getByText("Welcome to our site", { exact: true });

// Regex
page.getByText(/welcome/i);
```

### getByTestId

Configure custom test ID attribute in `playwright.config.ts`:

```typescript
use: {
  testIdAttribute: "data-testid"; // default
}
```

> This project sets `testIdAttribute: 'data-qa'` (the target app's hook attribute), so
> `getByTestId(...)` here resolves against `data-qa`, not `data-testid`.

Usage:

```typescript
// HTML: <button data-testid="submit-btn">Submit</button>
page.getByTestId("submit-btn");
```

## Filtering & Chaining

### filter()

Narrow down locators:

```typescript
// Filter by text
page.getByRole("listitem").filter({ hasText: "Product" });

// Filter by NOT having text
page.getByRole("listitem").filter({ hasNotText: "Out of stock" });

// Filter by child locator
page.getByRole("listitem").filter({
  has: page.getByRole("button", { name: "Buy" }),
});

// Combine filters
page
  .getByRole("listitem")
  .filter({ hasText: "Product" })
  .filter({ has: page.getByText("$9.99") });
```

### Chaining

```typescript
// Navigate down the DOM tree
page.getByRole("article").getByRole("heading");

// Get parent/ancestor
page.getByText("Child").locator("..");
page.getByText("Child").locator("xpath=ancestor::article");
```

### nth() and first()/last()

```typescript
page.getByRole("listitem").first();
page.getByRole("listitem").last();
page.getByRole("listitem").nth(2); // 0-indexed
```

## Dynamic Content

### Waiting for Elements

Locators auto-wait for actionability by default. For explicit state waiting:

```typescript
await page.getByRole("button").waitFor({ state: "visible" });
await page.getByText("Loading").waitFor({ state: "hidden" });
```

> **For comprehensive waiting strategies** (element state, navigation, network, polling with `toPass()`), see [assertions-waiting.md](assertions-waiting.md#waiting-strategies).

### Lists with Dynamic Items

```typescript
// Wait for specific count
await expect(page.getByRole("listitem")).toHaveCount(5);

// Get all matching elements
const items = await page.getByRole("listitem").all();
for (const item of items) {
  await expect(item).toBeVisible();
}
```

## Shadow DOM

Playwright pierces shadow DOM by default:

```typescript
// Automatically finds elements inside shadow roots
page.getByRole("button", { name: "Shadow Button" });

// Explicit shadow DOM traversal (if needed)
page.locator("my-component").locator("internal:shadow=button");
```

## Iframes

```typescript
// By frame name or URL
const frame = page.frameLocator('iframe[name="content"]');
await frame.getByRole("button").click();

// By index
const frame = page.frameLocator("iframe").first();

// Nested iframes
const nestedFrame = page.frameLocator("#outer").frameLocator("#inner");
await nestedFrame.getByText("Content").click();
```

## Debugging Locators

```typescript
// Highlight element in headed mode
await page.getByRole("button").highlight();

// Count matches
const count = await page.getByRole("listitem").count();

// Check if exists without waiting
const exists = (await page.getByRole("button").count()) > 0;

// Use Playwright Inspector
// PWDEBUG=1 npx playwright test
```

## Common Issues & Solutions

| Issue                   | Solution                                         |
| ----------------------- | ------------------------------------------------ |
| Multiple elements match | Add filters or use `nth()`, `first()`, `last()`  |
| Element not found       | Check visibility, wait for load, verify selector |
| Stale element           | Locators are lazy; re-query if DOM changes       |
| Dynamic IDs             | Use stable attributes like role, text, test-id   |
| Hidden elements         | Use `{ force: true }` only when necessary        |

## Anti-Patterns to Avoid

| Anti-Pattern                      | Problem                           | Solution                                          |
| --------------------------------- | --------------------------------- | ------------------------------------------------- |
| `page.locator('.btn-primary')`    | Brittle, implementation-dependent | `page.getByRole('button', { name: 'Submit' })`    |
| `page.locator('#dynamic-id-123')` | Breaks when IDs change            | Use stable attributes like role, text, or test-id |
| Testing implementation details    | Breaks on refactoring             | Test user-visible behavior                        |

## Related References

- **Debugging selector issues**: See [debugging.md](../debugging/debugging.md) for troubleshooting
- **Waiting for elements**: See [assertions-waiting.md](assertions-waiting.md) for waiting strategies
- **Using in Page Objects**: See [page-object-model.md](page-object-model.md) for organizing locators
