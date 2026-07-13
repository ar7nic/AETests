import type { Locator } from '@playwright/test';
import { Element } from './Element';

/**
 * Builds {@link Element}s with consistent `[Page] "Name"` labels.
 *
 * The owning page/component name is resolved lazily so that page objects can
 * declare their locators as field initialisers while still picking up the
 * subclass `PAGE_NAME`.
 */
export class ElementFactory {
  constructor(private readonly resolveOwnerName: () => string) {}

  create(name: string, locator: Locator): Element {
    return new Element(locator, `[${this.resolveOwnerName()}] "${name}"`);
  }
}
