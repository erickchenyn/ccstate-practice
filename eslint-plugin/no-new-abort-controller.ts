import { AST_NODE_TYPES, type TSESTree } from '@typescript-eslint/utils'
import { createRule } from './utils.ts'

export const noNewAbortController = createRule({
  name: 'no-new-abort-controller',
  defaultOptions: [],
  meta: {
    type: 'problem',
    docs: {
      description:
        'disallow `new AbortController()` — use resetSignal()/switchSignal() from the signal hierarchy instead',
    },
    schema: [],
    messages: {
      noNewAbortController:
        '`new AbortController()` is not allowed here. Use resetSignal()/switchSignal() from the signal hierarchy. Only utils/ may create AbortControllers directly.',
    },
  },
  create(context) {
    const filename = context.filename
    if (
      filename.includes('/src/utils/') ||
      filename.includes('/__tests__/') ||
      filename.endsWith('/main.tsx') ||
      filename.endsWith('/main.ts')
    ) {
      return {}
    }

    return {
      NewExpression(node: TSESTree.NewExpression) {
        if (
          node.callee.type === AST_NODE_TYPES.Identifier &&
          node.callee.name === 'AbortController'
        ) {
          context.report({
            node,
            messageId: 'noNewAbortController',
          })
        }
      },
    }
  },
})
