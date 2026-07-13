import { test } from '@playwright/test';
import type { Locator } from '@playwright/test';

/**
 * Thin wrapper around a Playwright {@link Locator}.
 *
 * Every *action* is automatically wrapped in a `test.step`, so page objects,
 * components, assistants and asserts never add manual steps. The underlying
 * `locator` is exposed (read-only) so the `asserts/` layer can run
 * `expect()` against it — assertions are stepped by that layer, not here.
 */
export class Element {
  constructor(
    private readonly _locator: Locator,
    private readonly _label: string,
  ) {}

  /** Human-readable label, e.g. `[Home] "Signup / Login link"`. */
  get label(): string {
    return this._label;
  }

  /** Underlying Playwright locator — for the asserts layer and scoping only. */
  get locator(): Locator {
    return this._locator;
  }

  private step<T>(action: string, body: () => Promise<T>): Promise<T> {
    return test.step(`${action} ${this._label}`, body);
  }

  // --- Actions (auto-stepped) ------------------------------------------------

  click(): Promise<void> {
    return this.step('Click', () => this._locator.click());
  }

  fill(value: string): Promise<void> {
    return this.step(`Fill "${value}" into`, () => this._locator.fill(value));
  }

  check(): Promise<void> {
    return this.step('Check', () => this._locator.check());
  }

  uncheck(): Promise<void> {
    return this.step('Uncheck', () => this._locator.uncheck());
  }

  selectOption(value: string): Promise<string[]> {
    return this.step(`Select "${value}" in`, () => this._locator.selectOption(value));
  }

  hover(): Promise<void> {
    return this.step('Hover', () => this._locator.hover());
  }

  scrollIntoView(): Promise<void> {
    return this.step('Scroll into view', () => this._locator.scrollIntoViewIfNeeded());
  }

  // --- Readers (auto-stepped) ------------------------------------------------

  innerText(): Promise<string> {
    return this.step('Read text of', () => this._locator.innerText());
  }
}
