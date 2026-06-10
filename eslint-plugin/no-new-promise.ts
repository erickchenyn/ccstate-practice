import { AST_NODE_TYPES, type TSESTree } from '@typescript-eslint/utils'
import { createRule } from './utils.ts'

export const noNewPromise = createRule({
  name: 'no-new-promise',
  defaultOptions: [],
  meta: {
    type: 'problem',
    docs: {
      description:
        'disallow `new Promise()` — use signal-aware helpers like createDeferredPromise() instead',
    },
    schema: [],
    messages: {
      noNewPromise:
        '`new Promise()` is not allowed here. Use signal-aware helpers (createDeferredPromise(), parallel()) or an existing abstraction instead. Only utils/ may create Promises directly.',
    },
  },
  create(context) {
    const filename = context.filename
    if (filename.includes('/src/utils/') || filename.includes('/__tests__/')) {
      return {}
    }

    return {
      NewExpression(node: TSESTree.NewExpression) {
        if (node.callee.type === AST_NODE_TYPES.Identifier && node.callee.name === 'Promise') {
          context.report({
            node,
            messageId: 'noNewPromise',
          })
        }
      },
    }
  },
})
