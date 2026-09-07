import js from '@eslint/js'
import { defineConfig, globalIgnores } from 'eslint/config'
import prettier from 'eslint-config-prettier'
import checkFile from 'eslint-plugin-check-file'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import simpleImportSort from 'eslint-plugin-simple-import-sort'
import vitest from 'eslint-plugin-vitest'
import globals from 'globals'
import tseslint from 'typescript-eslint'

export default defineConfig([
  globalIgnores([
    '.next',
    // Where `output: 'export'` writes the deployed build, and where the
    // end-to-end run's replay export goes, kept off `.next` so it cannot
    // interleave with the dev server started beside it. Minified output that no
    // rule here describes, gitignored, and rebuilt on every run.
    'out',
    'out-replay',
    'next-env.d.ts',
    'dist',
    'dist-ssr',
    'coverage',
    'release',
    '.claude',
    '.vscode',
    '.husky',
    'test-results',
    'playwright-report',
    'blob-report',
    'playwright/.cache',
  ]),
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx,js,jsx}'],
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
      'simple-import-sort': simpleImportSort,
      'check-file': checkFile,
    },
    languageOptions: {
      globals: {
        ...globals.browser,
      },
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
      'simple-import-sort/imports': 'error',
      'simple-import-sort/exports': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { varsIgnorePattern: '^_', argsIgnorePattern: '^_' },
      ],
      'check-file/filename-naming-convention': [
        'error',
        { '**/!(App).{ts,tsx}': 'KEBAB_CASE' },
        { ignoreMiddleExtensions: true },
      ],
      'check-file/folder-naming-convention': [
        'error',
        { 'src/**/!(__tests__)': 'KEBAB_CASE' },
      ],
    },
  },
  {
    files: ['**/*.test.{ts,tsx}', '**/*.spec.{ts,tsx}'],
    ...vitest.configs.recommended,
  },
  {
    files: [
      '*.config.{js,mjs,cjs,ts}',
      'vite.config.ts',
      'vitest.config.ts',
      'playwright.config.ts',
    ],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },
  {
    // Next's App Router requires non-component exports from layout and page
    // files (metadata, generateMetadata, viewport). The fast-refresh rule is a
    // Vite convention and does not describe how Next reloads these.
    files: ['src/app/**/*.{ts,tsx}'],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },
  prettier,
])
