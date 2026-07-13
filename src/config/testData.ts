/**
 * Fixed test data.
 *
 * Per SKILL.md, `config/testData.ts` holds environment-level / fixed data
 * (the canonical test user identity). Entities a test *creates* with
 * per-run randomisation (e.g. a unique signup email) are built by the
 * factories in `helpers/`.
 */
export const testUser = {
  name: 'Test User',
  /** Canonical address the factory derives unique per-run aliases from. */
  email: 'testuser.playwright.demo@example.com',
} as const;

export type TestUser = typeof testUser;
