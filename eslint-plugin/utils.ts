import { ESLintUtils } from '@typescript-eslint/utils'

interface RuleDocs {
  description: string
  recommended?: boolean
  requiresTypeChecking?: boolean
}

export const createRule = ESLintUtils.RuleCreator<RuleDocs>(
  (name) =>
    `https://github.com/erickchenyn/ccstate-refactor/blob/main/eslint-plugin/docs/${name}.md`,
)
