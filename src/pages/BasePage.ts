import type { FrameLocator, Locator, Page } from '@playwright/test';
import { ElementFactory } from '../utils';
import type { Element } from '../utils';

/**
 * Minimal base for page objects and components.
 *
 * Per SKILL.md it stays deliberately thin: it only provides the `el` factory
 * for declaring locators. Behaviour (navigation, workflows) lives in
 * `assistants/`; verification lives in `asserts/`.
 *
 * Subclasses set `PAGE_NAME`, which becomes the label namespace for every
 * `Element` they declare (`[PAGE_NAME] "Name"`).
 */
export abstract class BasePage {
  protected abstract readonly PAGE_NAME: string;

  private readonly factory = new ElementFactory(() => this.PAGE_NAME);

  constructor(protected readonly page: Page) {}

  /** Declare a locator as a labelled {@link Element}. */
  protected el(name: string, locator: Locator): Element {
    return this.factory.create(name, locator);
  }

  /**
   * Root for declaring elements that live inside an `<iframe>`.
   *
   * `selector` targets the `<iframe>` element itself. Chain any locator
   * strategy off the result and pass it straight to {@link el}:
   * `this.el('Pay', this.frame('#checkout').getByRole('button', { name: 'Pay' }))`.
   * Nest frames via `this.frame('#outer').frameLocator('#inner')`. Resolution is
   * lazy — the iframe is re-resolved on every action, so it survives re-renders.
   */
  protected frame(selector: string): FrameLocator {
    return this.page.frameLocator(selector);
  }
}
