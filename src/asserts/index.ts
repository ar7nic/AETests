import { CommonAsserts } from './CommonAsserts';

export { CommonAsserts };

/**
 * Asserts registry. Adding an entry here auto-creates its fixture
 * (see `fixtures/`). The key becomes the fixture name.
 */
export const asserts = {
  commonAsserts: CommonAsserts,
} as const;
