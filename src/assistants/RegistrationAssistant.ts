import type { Page } from '@playwright/test';
import { AccountCreatedPage, LoginPage, SignupPage } from '../pages';
import { step } from '../utils';
import type { RegistrationUser } from '../helpers';
import { BaseAuthAssistant } from './BaseAuthAssistant';

/**
 * Registration journey. Reuses the navigation/account steps from
 * {@link BaseAuthAssistant} and adds the signup-specific flow.
 *
 * Every public method is decorated with `@step`, so its element-level actions
 * nest beneath a single named entry in the report instead of being flat.
 */
export class RegistrationAssistant extends BaseAuthAssistant {
  private readonly login: LoginPage;
  private readonly signup: SignupPage;
  private readonly accountCreated: AccountCreatedPage;

  constructor(page: Page) {
    super(page);
    this.login = new LoginPage(page);
    this.signup = new SignupPage(page);
    this.accountCreated = new AccountCreatedPage(page);
  }

  /** Steps 5-6: enter name + email and submit the initial signup form. */
  @step('Sign up with name and email')
  async startSignup(user: RegistrationUser): Promise<void> {
    await this.login.signupName.fill(user.name);
    await this.login.signupEmail.fill(user.email);
    await this.login.signupButton.click();
  }

  /** Steps 8-9: fill the full account information form and create the account. */
  @step('Fill account information and create account')
  async fillAccountInformation(user: RegistrationUser): Promise<void> {
    if (user.title === 'Mr') {
      await this.signup.titleMr.check();
    } else {
      await this.signup.titleMrs.check();
    }

    await this.signup.password.fill(user.password);
    await this.signup.birthDay.selectOption(user.birthDay);
    await this.signup.birthMonth.selectOption(user.birthMonth);
    await this.signup.birthYear.selectOption(user.birthYear);

    await this.signup.newsletter.check();
    await this.signup.specialOffers.check();

    await this.signup.firstName.fill(user.firstName);
    await this.signup.lastName.fill(user.lastName);
    await this.signup.company.fill(user.company);
    await this.signup.address.fill(user.address);
    await this.signup.address2.fill(user.address2);
    await this.signup.country.selectOption(user.country);
    await this.signup.state.fill(user.state);
    await this.signup.city.fill(user.city);
    await this.signup.zipcode.fill(user.zipcode);
    await this.signup.mobileNumber.fill(user.mobileNumber);

    await this.signup.createAccountButton.click();
  }

  /** Step 11: continue past the "Account Created!" confirmation. */
  @step('Continue after account created')
  async continueAfterAccountCreated(): Promise<void> {
    await this.accountCreated.continueButton.click();
  }
}
