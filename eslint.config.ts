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
    plugins: {
      ccstate: ccstatePlugin,
    },
    rules: {
      'ccstate/test-files-in-tests-dir': 'error',
    },
  },
  {
    files: ['src/**/*.{ts,tsx}'],
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
      'ccstate/no-abort-swallower': 'error',
      'ccstate/no-accessor-escape': 'error',
      'ccstate/no-get-signal': 'warn',
      'ccstate/no-store-in-params': 'error',
      'ccstate/no-module-level-signal': 'error',
      'ccstate/command-async-signal': 'error',
      'ccstate/no-empty-promise-catch': 'error',
      'ccstate/no-void-statement': 'error',
      'ccstate/no-getter-setter-params': 'error',
      'ccstate/no-detach-in-signals': 'error',
      'ccstate/no-new-abort-controller': 'error',
      'ccstate/no-new-promise': 'error',
      'ccstate/no-side-effect-in-render': 'error',
      'ccstate/require-accept': 'error',
      'ccstate/require-client-signal': 'error',
      'ccstate/layer-boundaries': 'error',
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
