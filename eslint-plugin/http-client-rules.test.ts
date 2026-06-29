import { Linter, type ESLint } from 'eslint'
import tseslint from 'typescript-eslint'
import { describe, expect, it } from 'vitest'
import { requireAccept } from './require-accept.ts'
import { requireClientSignal } from './require-client-signal.ts'

const plugin = {
  rules: {
    'require-accept': requireAccept,
    'require-client-signal': requireClientSignal,
  },
} as unknown as ESLint.Plugin

const config: Linter.Config = {
  files: ['**/*.ts'],
  languageOptions: {
    parser: tseslint.parser,
    ecmaVersion: 2020,
    sourceType: 'module',
  },
  plugins: {
    ccstate: plugin,
  },
  rules: {
    'ccstate/require-accept': 'error',
    'ccstate/require-client-signal': 'error',
  },
}

function verify(code: string) {
  const linter = new Linter({ configType: 'flat' })
  return linter.verify(code, config, {
    filename: `${process.cwd()}/src/signals/users.ts`,
  })
}

describe('http client rules', () => {
  it('allows httpClient$ calls wrapped in accept with fetchOptions.signal', () => {
    expect(
      verify(`
        command(async ({ get }, signal: AbortSignal) => {
          const client = get(httpClient$)(usersContract)
          await accept(client.list({ fetchOptions: { signal } }), [200])
        })
      `),
    ).toHaveLength(0)
  })

  it('requires accept around httpClient$ calls', () => {
    expect(
      verify(`
        command(async ({ get }, signal: AbortSignal) => {
          const client = get(httpClient$)(usersContract)
          await client.list({ fetchOptions: { signal } })
        })
      `),
    ).toEqual([
      expect.objectContaining({
        messageId: 'requireAccept',
        ruleId: 'ccstate/require-accept',
      }),
    ])
  })

  it('requires fetchOptions.signal inside async signal-bearing functions', () => {
    expect(
      verify(`
        command(async ({ get }, signal: AbortSignal) => {
          const client = get(httpClient$)(usersContract)
          await accept(client.list(), [200])
        })
      `),
    ).toEqual([
      expect.objectContaining({
        messageId: 'missingFetchOptions',
        ruleId: 'ccstate/require-client-signal',
      }),
    ])
  })
})
