import { Linter, type ESLint } from 'eslint'
import { describe, expect, it } from 'vitest'
import { testFilesInTestsDir } from '../test-files-in-tests-dir.ts'

const plugin = {
  rules: {
    'test-files-in-tests-dir': testFilesInTestsDir,
  },
} as unknown as ESLint.Plugin

const config: Linter.Config = {
  files: ['**/*.{ts,tsx}'],
  languageOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
  },
  plugins: {
    ccstate: plugin,
  },
  rules: {
    'ccstate/test-files-in-tests-dir': 'error',
  },
}

function verify(filename: string) {
  const linter = new Linter({ configType: 'flat' })
  return linter.verify('const value = 1', config, { filename })
}

describe('test-files-in-tests-dir', () => {
  it('allows test files directly inside __tests__ directories', () => {
    expect(verify(`${process.cwd()}/src/__tests__/App.test.tsx`)).toHaveLength(0)
    expect(verify(`${process.cwd()}/eslint-plugin/__tests__/rule.test.ts`)).toHaveLength(0)
  })

  it('reports test files next to source files', () => {
    expect(verify(`${process.cwd()}/src/App.test.tsx`)).toEqual([
      expect.objectContaining({
        messageId: 'testOutsideTestsDir',
        ruleId: 'ccstate/test-files-in-tests-dir',
      }),
    ])
  })
})
