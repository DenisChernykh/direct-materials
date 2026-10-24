import js from '@eslint/js'
import reactHooks from 'eslint-plugin-react-hooks'
import tseslint from 'typescript-eslint'

export default [
  {
    ignores: [
      'dist',
      'node_modules',
      '.wrangler',
      '**/*.json',
      '**/*.jsonc',
      '**/*.yaml',
      '**/*.yml',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  reactHooks.configs['recommended-latest'],
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: {
        afterEach: 'readonly',
        beforeAll: 'readonly',
        beforeEach: 'readonly',
        clearTimeout: 'readonly',
        console: 'readonly',
        crypto: 'readonly',
        describe: 'readonly',
        document: 'readonly',
        expect: 'readonly',
        fetch: 'readonly',
        Headers: 'readonly',
        HTMLButtonElement: 'readonly',
        HTMLInputElement: 'readonly',
        HTMLSelectElement: 'readonly',
        HTMLTextAreaElement: 'readonly',
        it: 'readonly',
        MessageBatch: 'readonly',
        navigator: 'readonly',
        PopStateEvent: 'readonly',
        process: 'readonly',
        Queue: 'readonly',
        Request: 'readonly',
        Response: 'readonly',
        SELF: 'readonly',
        setTimeout: 'readonly',
        TextDecoder: 'readonly',
        TextEncoder: 'readonly',
        URL: 'readonly',
        URLSearchParams: 'readonly',
        vi: 'readonly',
        window: 'readonly',
      },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
  {
    files: ['scripts/**/*.mjs'],
    languageOptions: {
      globals: { console: 'readonly', process: 'readonly' },
    },
    rules: { 'no-unused-vars': ['error', { argsIgnorePattern: '^_' }] },
  },
]
