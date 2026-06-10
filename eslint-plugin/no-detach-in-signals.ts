import type { TSESTree } from '@typescript-eslint/utils'
import { createRule } from './utils.ts'

export const noDetachInSignals = createRule({
  name: 'no-detach-in-signals',
  defaultOptions: [],
  meta: {
    type: 'problem',
    docs: {
      description: 'disallow detach() in signals/ files — use await or signal chain instead',
    },
    schema: [],
    messages: {
      noDetachInSignals:
        'Do not use detach() in signals/. In the signals layer, manage async work with await or the signal chain. detach() is only for DOM event callbacks in the views layer.',
    },
  },
  create(context) {
    const filename = context.filename
    if (!filename.includes('/src/signals/') || filename.includes('/__tests__/')) {
      return {}
    }

    return {
      CallExpression(node: TSESTree.CallExpression) {
        if (node.callee.type === 'Identifier' && node.callee.name === 'detach') {
          context.report({
            node,
            messageId: 'noDetachInSignals',
          })
        }
      },
    }
  },
})
