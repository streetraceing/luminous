// @ts-check

import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';

export default defineConfig({
  files: ['{src,vite}/**/*.ts'],
  extends: [tseslint.configs.recommended],
});
