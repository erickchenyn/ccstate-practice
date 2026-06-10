import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import eslintConfigPrettier from 'eslint-config-prettier'
import { defineConfig, globalIgnores } from 'eslint/config'
import { ccstatePlugin } from './eslint-plugin/index.ts'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    plugins: {
      ccstate: ccstatePlugin,
    },
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      'ccstate/abort-signal-reason': 'error',
      'ccstate/signal-dollar-suffix': 'error',
      'ccstate/no-export-state': 'error',
      'ccstate/signal-check-await': 'error',
      'ccstate/no-catch-abort': 'error',
      'ccstate/no-get-signal': 'warn',
      'ccstate/no-store-in-params': 'error',
      'ccstate/no-module-level-signal': 'error',
    },
  },
  {
    files: ['src/**/__tests__/**/*.{ts,tsx}'],
    rules: {
      'ccstate/signal-check-await': 'off',
    },
  },
  eslintConfigPrettier,
])
