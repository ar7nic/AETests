import { BasePage } from './BasePage';
import type { Element } from '../utils';

/** Combined login / signup page (`/login`). Holds locators only. */
export class LoginPage extends BasePage {
  protected readonly PAGE_NAME = 'Login';

  // --- New user signup form ---
  readonly newUserSignupHeading: Element = this.el(
    'New User Signup! heading',
    this.page.getByRole('heading', { name: 'New User Signup!' }),
  );

  readonly signupName: Element = this.el('Signup name', this.page.getByTestId('signup-name'));

  readonly signupEmail: Element = this.el('Signup email', this.page.getByTestId('signup-email'));

  readonly signupButton: Element = this.el(
    'Signup button',
    this.page.getByRole('button', { name: 'Signup' }),
  );

  // --- Existing user login form ---
  readonly loginToYourAccountHeading: Element = this.el(
    'Login to your account heading',
    this.page.getByRole('heading', { name: 'Login to your account' }),
  );

  readonly loginEmail: Element = this.el(
    'Login email',
    this.page.getByTestId('login-email'),
  );

  readonly loginPassword: Element = this.el(
    'Login password',
    this.page.getByTestId('login-password'),
  );

  readonly loginButton: Element = this.el(
    'Login button',
    this.page.getByRole('button', { name: 'Login' }),
  );
}
