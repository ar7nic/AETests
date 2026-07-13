import { BasePage } from './BasePage';
import type { Element } from '../utils';

/** Confirmation shown after registration (`/account_created`). Locators only. */
export class AccountCreatedPage extends BasePage {
  protected readonly PAGE_NAME = 'AccountCreated';

  readonly heading: Element = this.el(
    'Account Created! heading',
    this.page.getByTestId('account-created'),
  );

  readonly continueButton: Element = this.el(
    'Continue button',
    this.page.getByTestId('continue-button'),
  );
}
