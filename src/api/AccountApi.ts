import type { APIRequestContext } from '@playwright/test';
import type { RegistrationUser, UserCredentials } from '../helpers';

/**
 * Thin client over the automationexercise account API.
 *
 * Used to set up / tear down preconditions (a registered account) far faster
 * and more reliably than driving the full UI registration — the recommended
 * "arrange state via API, exercise the flow via UI" pattern. Paths resolve
 * against the configured `baseURL`.
 */
export class AccountApi {
  constructor(private readonly request: APIRequestContext) {}

  /**
   * Create an account (API 11). Returns the credentials to log in with.
   * The API always responds HTTP 200 with a body describing the real outcome,
   * so success is asserted on the body text.
   */
  async createAccount(user: RegistrationUser): Promise<UserCredentials> {
    const response = await this.request.post('/api/createAccount', {
      form: {
        name: user.name,
        email: user.email,
        password: user.password,
        title: user.title,
        birth_date: user.birthDay,
        birth_month: user.birthMonth,
        birth_year: user.birthYear,
        firstname: user.firstName,
        lastname: user.lastName,
        company: user.company,
        address1: user.address,
        address2: user.address2,
        country: user.country,
        zipcode: user.zipcode,
        state: user.state,
        city: user.city,
        mobile_number: user.mobileNumber,
      },
    });

    const body = await response.text();
    if (!body.includes('User created!')) {
      throw new Error(`createAccount failed (HTTP ${response.status()}): ${body}`);
    }

    return { email: user.email, password: user.password };
  }

  /**
   * Best-effort account deletion (API 12) for teardown. Ignores the outcome —
   * the UI test may have already deleted the account.
   */
  async deleteAccountQuietly(credentials: UserCredentials): Promise<void> {
    await this.request.delete('/api/deleteAccount', {
      form: { email: credentials.email, password: credentials.password },
    });
  }
}
