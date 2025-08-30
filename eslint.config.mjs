import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { FlatCompat } from '@eslint/eslintrc'
import js from '@eslint/js'
import typescriptEslint from '@typescript-eslint/eslint-plugin'
import tsParser from '@typescript-eslint/parser'
import casePolice from 'eslint-plugin-case-police'
import prettier from 'eslint-plugin-prettier'
import react from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import testingLibrary from 'eslint-plugin-testing-library'
import { defineConfig } from 'eslint/config'
import globals from 'globals'
import { configs } from 'typescript-eslint'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const compat = new FlatCompat({
    baseDirectory: __dirname,
    recommendedConfig: js.configs.recommended,
    allConfig: js.configs.all,
})

export default defineConfig([
    {
        extends: compat.extends('eslint:recommended', 'prettier'),
        plugins: {
            '@typescript-eslint': typescriptEslint,
            prettier,
        },
        languageOptions: {
            globals: {
                ...globals.browser,
                ...globals.node,
            },

            parser: tsParser,
            ecmaVersion: 'latest',
            sourceType: 'module',
        },
        rules: {
            'prettier/prettier': 'error',
        },
    },
    {
        files: ['**/*.{ts|tsx}'],
        extends: [
            ...configs.strictTypeChecked,
            ...configs.stylisticTypeChecked,
        ],
        plugins: { 'case-police': casePolice },
        rules: {
            '@typescript-eslint/no-explicit-any': 'warn',
            '@typescript-eslint/no-unused-vars': [
                'error',
                {
                    argsIgnorePattern: '^_',
                },
            ],

            '@typescript-eslint/no-deprecated': 'warn',
            '@typescript-eslint/no-misused-promises': 'error',
            '@typescript-eslint/no-floating-promises': [
                'error',
                { ignoreVoid: false },
            ],
            '@typescript-eslint/switch-exhaustiveness-check': 'error',
            '@typescript-eslint/prefer-readonly': 'error',
            'no-unused-vars': 'off',
            'no-console': 'warn',
            'prefer-const': 'error',
            'no-restricted-syntax': [
                'error',
                {
                    selector: 'ExportAllDeclaration',
                    message:
                        'Export * (re-exports) are not allowed. Please use named exports instead.',
                },
            ],
            'arrow-body-style': 'off',
            'prefer-arrow-callback': 'off',
            'case-police/string-check': [
                'error',
                {
                    dict: {},
                },
            ],
        },
    },
    {
        files: ['**/*.tsx'],
        plugins: {
            'react-hooks': reactHooks,
            'react-refresh': reactRefresh,
            react,
        },
        rules: {
            ...reactHooks.configs.recommended.rules,
            'react/function-component-definition': ['error'],
            'react-refresh/only-export-components': [
                'warn',
                { allowConstantExport: true },
            ],
        },
    },
    {
        files: ['**/*.test.{ts,tsx}'],
        ...testingLibrary.configs['flat/react'],
        rules: {
            ...testingLibrary.configs['flat/react'].rules,
            'testing-library/no-node-access': 'warn',
            'testing-library/prefer-user-event': 'error',
            'testing-library/prefer-explicit-assert': 'error',
        },
    },
])
