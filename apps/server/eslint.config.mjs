import tsBaseConfig from '@map-colonies/eslint-config/ts-base';
import vitestConfig from '@map-colonies/eslint-config/vitest';
import { defineConfig } from 'eslint/config';

export default defineConfig(
  {
    ignores: ['vitest.config.mts', '**/vitest.config.mts', 'dist/**', 'coverage/**', 'assets/**'],
  },
  vitestConfig,
  tsBaseConfig,
  {
    ignores: ['vitest.config.mts', '**/vitest.config.mts', 'dist/**', 'coverage/**', 'assets/**'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/strict-boolean-expressions': 'off',
      '@typescript-eslint/no-magic-numbers': 'off',
      '@typescript-eslint/naming-convention': 'off',
      '@map-colonies/pino-safety-prefer-standard-error-key': 'off',
      'import-x/order': 'off',
      'unicorn/prefer-node-protocol': 'off',
      '@typescript-eslint/prefer-readonly': 'off',
      '@typescript-eslint/member-ordering': 'off',
      'vitest/padding-around-all': 'off',
      'vitest/prefer-expect-resolves': 'off',
      '@typescript-eslint/no-unnecessary-condition': 'off',
      'import-x/exports-last': 'off',
      '@typescript-eslint/unbound-method': 'off',
      'no-useless-assignment': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/prefer-nullish-coalescing': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
      'import-x/no-named-as-default-member': 'off',
    },
  }
);
