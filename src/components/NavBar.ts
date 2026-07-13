import { BasePage } from '../pages/BasePage';
import type { Element } from '../utils';

/**
 * Site-wide header navigation. A reusable component composed by page objects
 * (e.g. {@link HomePage}). Holds locators only.
 */
export class NavBar extends BasePage {
  protected readonly PAGE_NAME = 'NavBar';

  readonly signupLoginLink: Element = this.el(
    'Signup / Login link',
    this.page.getByRole('link', { name: 'Signup / Login' }),
  );

  readonly logoutLink: Element = this.el(
    'Logout link',
    this.page.getByRole('link', { name: 'Logout' }),
  );

  readonly deleteAccountLink: Element = this.el(
    'Delete Account link',
    this.page.getByRole('link', { name: 'Delete Account' }),
  );

  /** The `Logged in as <username>` indicator shown once authenticated. */
  readonly loggedInAs: Element = this.el(
    'Logged in as indicator',
    this.page.getByText('Logged in as'),
  );
}
