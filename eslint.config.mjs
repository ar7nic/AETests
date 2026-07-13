import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import playwright from 'eslint-plugin-playwright';
import prettier from 'eslint-config-prettier';

export default tseslint.config(
  {
    ignores: [
      'node_modules',
      'allure-results',
      'allure-report',
      'playwright-report',
      'test-results',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: {
          allowDefaultProject: ['eslint.config.mjs', '.prettierrc.json'],
        },
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/await-thenable': 'error',
      '@typescript-eslint/consistent-type-imports': 'error',
    },
  },
  {
    files: ['src/tests/**/*.spec.ts'],
    ...playwright.configs['flat/recommended'],
    rules: {
      ...playwright.configs['flat/recommended'].rules,
      // Verification runs through the asserts layer (e.g. commonAsserts.toBeVisible),
      // so teach the rule to recognise those wrappers as assertions.
      'playwright/expect-expect': [
        'error',
        {
          // The rule matches the called method's (last) identifier, so list the
          // CommonAsserts method names that stand in for raw expect().
          assertFunctionNames: ['expect', 'toBeVisible', 'toContainText', 'pageHasTitle'],
        },
      ],
    },
  },
  prettier,
);
