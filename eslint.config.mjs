// @ts-check

import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';

export default defineConfig(
  {
    files: ['{src,vite}/**/*.ts'],
    extends: [tseslint.configs.recommended],
  },
  {
    files: ['src/types/**/*.d.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
);
