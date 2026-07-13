import type { Page } from '@playwright/test';
import { AccountDeletedPage } from '../pages';
import { NavBar } from '../components';
import { step } from '../utils';

/**
 * Shared auth/account workflow steps reused by both the registration and login
 * journeys (open home, reach the auth page, delete an account). Concrete
 * assistants extend this and add their own flow-specific methods.
 *
 * Not registered as a fixture (abstract); only its subclasses are.
 */
export abstract class BaseAuthAssistant {
  protected readonly navBar: NavBar;
  protected readonly accountDeleted: AccountDeletedPage;

  constructor(protected readonly page: Page) {
    this.navBar = new NavBar(page);
    this.accountDeleted = new AccountDeletedPage(page);
  }

  /** Open the home page. */
  @step('Open the home page')
  async openHomePage(): Promise<void> {
    await this.page.goto('/');
  }

  /** Navigate to the Signup / Login page. */
  @step('Go to Signup / Login')
  async goToSignupLogin(): Promise<void> {
    await this.navBar.signupLoginLink.click();
  }

  /** Delete the currently logged-in account. */
  @step('Delete account')
  async deleteAccount(): Promise<void> {
    await this.navBar.deleteAccountLink.click();
  }

  /** Continue past the "Account Deleted!" confirmation. */
  @step('Continue after account deleted')
  async continueAfterAccountDeleted(): Promise<void> {
    await this.accountDeleted.continueButton.click();
  }
}
