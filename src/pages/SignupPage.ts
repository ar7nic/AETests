import { BasePage } from './BasePage';
import type { Element } from '../utils';

/** Account information / registration form (`/signup`). Holds locators only. */
export class SignupPage extends BasePage {
  protected readonly PAGE_NAME = 'Signup';

  readonly enterAccountInfo: Element = this.el(
    'Enter Account Information title',
    this.page.getByText('Enter Account Information'),
  );

  // Title
  readonly titleMr: Element = this.el('Title Mr radio', this.page.locator('#id_gender1'));
  readonly titleMrs: Element = this.el('Title Mrs radio', this.page.locator('#id_gender2'));

  // Credentials
  readonly password: Element = this.el('Password', this.page.getByTestId('password'));

  // Date of birth
  readonly birthDay: Element = this.el('Birth day', this.page.getByTestId('days'));
  readonly birthMonth: Element = this.el('Birth month', this.page.getByTestId('months'));
  readonly birthYear: Element = this.el('Birth year', this.page.getByTestId('years'));

  // Opt-ins
  readonly newsletter: Element = this.el('Newsletter checkbox', this.page.locator('#newsletter'));
  readonly specialOffers: Element = this.el('Special offers checkbox', this.page.locator('#optin'));

  // Address information
  readonly firstName: Element = this.el('First name', this.page.getByTestId('first_name'));
  readonly lastName: Element = this.el('Last name', this.page.getByTestId('last_name'));
  readonly company: Element = this.el('Company', this.page.getByTestId('company'));
  readonly address: Element = this.el('Address', this.page.getByTestId('address'));
  readonly address2: Element = this.el('Address 2', this.page.getByTestId('address2'));
  readonly country: Element = this.el('Country', this.page.getByTestId('country'));
  readonly state: Element = this.el('State', this.page.getByTestId('state'));
  readonly city: Element = this.el('City', this.page.getByTestId('city'));
  readonly zipcode: Element = this.el('Zipcode', this.page.getByTestId('zipcode'));
  readonly mobileNumber: Element = this.el('Mobile number', this.page.getByTestId('mobile_number'));

  readonly createAccountButton: Element = this.el(
    'Create Account button',
    this.page.getByRole('button', { name: 'Create Account' }),
  );
}
