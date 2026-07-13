import { testUser } from '../config';

/** Title options offered by the registration form. */
export type Title = 'Mr' | 'Mrs';

/** Credentials needed to log an existing account in. */
export interface UserCredentials {
  email: string;
  password: string;
}

/** A complete user entity required to register an account. */
export interface RegistrationUser {
  title: Title;
  name: string;
  email: string;
  password: string;
  birthDay: string;
  birthMonth: string;
  birthYear: string;
  firstName: string;
  lastName: string;
  company: string;
  address: string;
  address2: string;
  country: string;
  state: string;
  city: string;
  zipcode: string;
  mobileNumber: string;
}

/**
 * Turns the canonical address from `config` into a unique per-run alias so
 * repeated runs never collide with an account that already exists on the
 * target site (which rejects duplicate emails).
 *
 * `foo@example.com` -> `foo+17192safe@example.com`
 */
function uniqueEmail(base: string): string {
  const suffix = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  const [local, domain] = base.split('@');
  return `${local}+${suffix}@${domain}`;
}

/**
 * Builds a registration user. The identity (name + email base) comes from
 * `config/testData.ts`; everything else is generated. Pass `overrides` to
 * pin specific fields in a test.
 */
export function buildRegistrationUser(overrides: Partial<RegistrationUser> = {}): RegistrationUser {
  return {
    title: 'Mr',
    name: testUser.name,
    email: uniqueEmail(testUser.email),
    password: 'Str0ng!Pass_2024',
    birthDay: '10',
    birthMonth: '5',
    birthYear: '1995',
    firstName: 'Test',
    lastName: 'User',
    company: 'Playwright QA',
    address: '221B Baker Street',
    address2: 'Suite 100',
    country: 'United States',
    state: 'California',
    city: 'San Francisco',
    zipcode: '94016',
    mobileNumber: '5551234567',
    ...overrides,
  };
}
