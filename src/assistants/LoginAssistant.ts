import type { Page } from '@playwright/test';
import { LoginPage } from '../pages';
import { step } from '../utils';
import type { UserCredentials } from '../helpers';
import { BaseAuthAssistant } from './BaseAuthAssistant';

/**
 * Login journey. Reuses the navigation/account steps from
 * {@link BaseAuthAssistant} and adds the login submission itself.
 */
export class LoginAssistant extends BaseAuthAssistant {
  private readonly loginPage: LoginPage;

  constructor(page: Page) {
    super(page);
    this.loginPage = new LoginPage(page);
  }

  /** Steps 6-7: enter credentials in the login form and submit. */
  @step('Log in with email and password')
  async login(credentials: UserCredentials): Promise<void> {
    await this.loginPage.loginEmail.fill(credentials.email);
    await this.loginPage.loginPassword.fill(credentials.password);
    await this.loginPage.loginButton.click();
  }
}
