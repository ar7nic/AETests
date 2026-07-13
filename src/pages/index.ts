import { HomePage } from './HomePage';
import { LoginPage } from './LoginPage';
import { SignupPage } from './SignupPage';
import { AccountCreatedPage } from './AccountCreatedPage';
import { AccountDeletedPage } from './AccountDeletedPage';

export { BasePage } from './BasePage';
export { HomePage, LoginPage, SignupPage, AccountCreatedPage, AccountDeletedPage };

/**
 * Page-object registry. Adding an entry here auto-creates its fixture
 * (see `fixtures/`) — no manual wiring. The key becomes the fixture name.
 */
export const pageObjects = {
  homePage: HomePage,
  loginPage: LoginPage,
  signupPage: SignupPage,
  accountCreatedPage: AccountCreatedPage,
  accountDeletedPage: AccountDeletedPage,
} as const;
