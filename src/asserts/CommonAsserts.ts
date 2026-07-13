import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import type { Element } from '../utils';

/**
 * Reusable verification helpers. Tests call these instead of raw `expect()`
 * so reports show readable, stepped `ASSERT ...` entries. This is the only
 * layer (besides the test framework) that touches `expect`.
 */
export class CommonAsserts {
  constructor(private readonly page: Page) {}

  async toBeVisible(element: Element): Promise<void> {
    await test.step(`ASSERT ${element.label} is visible`, async () => {
      await expect(element.locator).toBeVisible();
    });
  }

  async toContainText(element: Element, text: string): Promise<void> {
    await test.step(`ASSERT ${element.label} contains "${text}"`, async () => {
      await expect(element.locator).toContainText(text);
    });
  }

  async pageHasTitle(title: string): Promise<void> {
    await test.step(`ASSERT page title is "${title}"`, async () => {
      await expect(this.page).toHaveTitle(title);
    });
  }
}
