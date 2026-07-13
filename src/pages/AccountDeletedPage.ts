import { BasePage } from './BasePage';
import type { Element } from '../utils';

/** Confirmation shown after deleting an account (`/delete_account`). Locators only. */
export class AccountDeletedPage extends BasePage {
  protected readonly PAGE_NAME = 'AccountDeleted';

  readonly heading: Element = this.el(
    'Account Deleted! heading',
    this.page.getByTestId('account-deleted'),
  );

  readonly continueButton: Element = this.el(
    'Continue button',
    this.page.getByTestId('continue-button'),
  );
}
