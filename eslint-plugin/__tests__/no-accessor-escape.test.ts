import { Linter, type ESLint } from 'eslint'
import { describe, expect, it } from 'vitest'
import { noAccessorEscape } from '../no-accessor-escape.ts'

const plugin = {
  rules: {
    'no-accessor-escape': noAccessorEscape,
  },
} as unknown as ESLint.Plugin

const config: Linter.Config = {
  languageOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
  },
  plugins: {
    ccstate: plugin,
  },
  rules: {
    'ccstate/no-accessor-escape': 'error',
  },
}

function verify(code: string) {
  const linter = new Linter({ configType: 'flat' })
  return linter.verify(code, config)
}

describe('no-accessor-escape', () => {
  it('allows direct accessor calls inside command and computed callbacks', () => {
    expect(
      verify('command(({ get, set }) => { const value = get(count$); set(total$, value); })'),
    ).toHaveLength(0)
    expect(verify('computed((get) => pages.map((page$) => get(page$)))')).toHaveLength(0)
  })

  it('reports accessor values passed, wrapped, aliased, returned, or deferred', () => {
    const invalidCases = [
      'command(({ get }) => { helper(pages, get); })',
      'command(({ set }) => { helper({ set }); })',
      'command(({ set }) => { helper({ setFlow: set }); })',
      'command(({ get }) => { const read = get; return read(count$); })',
      'command(({ get }) => { return get; })',
      'command(({ get }) => { return () => get(count$); })',
      'command(({ get }) => { setTimeout(() => get(count$), 0); })',
      'computed((get) => helper(get))',
    ]

    for (const code of invalidCases) {
      expect(verify(code)).toEqual([
        expect.objectContaining({
          messageId: 'accessorEscape',
          ruleId: 'ccstate/no-accessor-escape',
        }),
      ])
    }
  })
})
