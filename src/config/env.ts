/**
 * Environment configuration.
 *
 * Per SKILL.md, environment values (URLs, credentials, storageState paths)
 * are sourced from `process.env` here so the rest of the framework never
 * reads `process.env` directly.
 */
export const env = {
  /** Base URL of the system under test. */
  baseURL: process.env.BASE_URL ?? 'https://automationexercise.com',
} as const;

export type Env = typeof env;
