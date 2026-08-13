# AETests — Playwright + TypeScript + Allure

End-to-end automation framework for [automationexercise.com](https://automationexercise.com),
built to the layered architecture defined in
`.agents/skills/playwright-best-practices/SKILL.md`.
Development stage.

## Stack

Playwright · TypeScript (strict) · Node.js · allure-playwright · ESLint 9 · Prettier · Chromium only

## Architecture

```
src/
├── tests/        scenarios only (import test/expect from fixtures)
├── assistants/   multi-step, cross-page workflows (actions)
├── asserts/      verification helpers wrapping expect() ("ASSERT ...")
├── pages/        page objects: locators only (extend BasePage, set PAGE_NAME)
├── components/   reusable UI blocks (NavBar)
├── utils/        Element (auto-stepped Locator wrapper) + ElementFactory
├── fixtures/     auto-registering DI container; exports `test` and `expect`
├── api/          thin APIRequestContext clients for fast state setup (AccountApi)
├── helpers/      factories for entities a test creates (unique-per-run user)
└── config/       env + fixed test data (from process.env)
```

Each layer only calls the layer below it. Adding a class to a `pages` / `asserts` /
`assistants` barrel auto-creates its fixture — no manual wiring.

## Getting started

```bash
npm install
npx playwright install chromium
```

## Commands

| Command                   | Purpose                                       |
| ------------------------- | --------------------------------------------- |
| `npm test`                | Run the suite (Chromium)                      |
| `npm run test:headed`     | Run with a visible browser                    |
| `npm run test:debug`      | Run with the Playwright Inspector             |
| `npm run typecheck`       | TypeScript strict validation (`tsc --noEmit`) |
| `npm run lint`            | ESLint 9                                      |
| `npm run format`          | Prettier write                                |
| `npm run allure:generate` | Generate the Allure HTML report               |
| `npm run allure:open`     | Open the generated Allure report              |
| `npm run allure:serve`    | Generate + serve Allure in one step           |

## Reporting

`allure-playwright` is the primary reporter. Screenshots, traces and video are
retained on failure. After a run:

```bash
npm run allure:generate && npm run allure:open
```

## Test data

`config/testData.ts` holds the fixed identity (`Test User`,
`testuser.playwright.demo@example.com`). `helpers/userFactory.ts` derives a
**unique per-run email alias** from it so reruns never collide with an
already-registered account on the live site.

## Known target-site limitations

automationexercise.com is a slow public demo site; the framework accommodates it:

- **Intermittent blank POST-navigation pages.** It occasionally returns an
  incomplete document for `/signup` or `/account_created`. Handled by Playwright
  test **retries** (`retries: 2`) — a fresh full re-run, not a hardcoded wait.
- **Google "vignette" interstitial ads** can hijack page transitions. The
  `isolateThirdParties` auto-fixture allowlists the site under test and aborts
  all third-party requests, so the ad scripts never load and navigation stays
  deterministic (and faster).
- **Duplicate emails are rejected.** Mitigated by the unique-per-run alias above.
- **Non-semantic headings.** `ENTER ACCOUNT INFORMATION` / `ACCOUNT CREATED!` /
  `ACCOUNT DELETED!` are CSS-uppercased `<b>`/`<h2>` text, so they are located via
  `getByText` / `data-qa` rather than `getByRole('heading')`.

## Running tests in Docker

Build the image:
```
docker build -t aetests .
```

Run the full suite:
```
docker run --rm -v ${PWD}/allure-results:/app/allure-results aetests
```

Run tests and view the Allure report locally:
```
docker compose up --build
```
Then open http://localhost:9323 (the `report` service generates the Allure HTML
and serves it once the `tests` service finishes).

## Continuous integration

Two GitHub Actions workflows live in `.github/workflows/`, both currently
**manual-trigger only** (`workflow_dispatch`; the push/PR triggers are commented
out). The test step is non-blocking (`npm test || true`) so reports publish even
on failures — expected against a flaky public demo site.

- **`playwright.yml`** — native run on `ubuntu-latest`: `npm ci`, install
  Chromium, run the suite, then generate the Allure report and publish it to the
  `gh-pages` branch (`peaceiris/actions-gh-pages`). Prior history is pulled from
  `gh-pages` first, so the trend graph accumulates across runs. Raw
  `allure-results` and failure traces/screenshots/videos upload as artifacts.
- **`playwright-docker.yml`** — same suite via the `Dockerfile`, producing a
  single-file Allure report uploaded as an artifact.
