import { AST_NODE_TYPES, type TSESTree } from '@typescript-eslint/utils'
import { createRule } from './utils.ts'

const abortSwallowers = new Set(['throwIfNotAbort'])

function isAbortSwallower(node: TSESTree.Expression | TSESTree.SpreadElement): boolean {
  return node.type === AST_NODE_TYPES.Identifier && abortSwallowers.has(node.name)
}

function isEmptyFunction(node: TSESTree.Expression | TSESTree.SpreadElement): boolean {
  if (
    node.type === AST_NODE_TYPES.ArrowFunctionExpression ||
    node.type === AST_NODE_TYPES.FunctionExpression
  ) {
    return node.body.type === AST_NODE_TYPES.BlockStatement && node.body.body.length === 0
  }
  return false
}

export const noAbortSwallower = createRule({
  name: 'no-abort-swallower',
  defaultOptions: [],
  meta: {
    type: 'problem',
    docs: {
      description: 'disallow rejection handlers that silently swallow promise failures',
    },
    schema: [],
    messages: {
      noAbortSwallower:
        'Do not use `{{handler}}` as a promise rejection handler. It silently swallows AbortError and escapes detached-promise cleanup tracking. Use `detach(<expr>, Reason.DomCallback)` from DOM callbacks, or `await` with a parent signal.',
      noEmptyThenReject:
        'Do not use an empty rejection handler in `.then(_, () => {})`. It swallows the input promise rejection and resolves the chain to undefined. Use `detach(<expr>, Reason.DomCallback)` or restructure the async flow.',
    },
  },
  create(context) {
    return {
      CallExpression(node: TSESTree.CallExpression) {
        if (
          node.callee.type !== AST_NODE_TYPES.MemberExpression ||
          node.callee.property.type !== AST_NODE_TYPES.Identifier
        ) {
          return
        }

        const method = node.callee.property.name

        if (method === 'catch' && node.arguments.length === 1) {
          const handler = node.arguments[0]
          if (!isAbortSwallower(handler)) {
            return
          }
          context.report({
            node,
            messageId: 'noAbortSwallower',
            data: {
              handler: handler.type === AST_NODE_TYPES.Identifier ? handler.name : 'handler',
            },
          })
          return
        }

        if (method !== 'then' || node.arguments.length < 2) {
          return
        }

        const rejectHandler = node.arguments[1]
        if (isAbortSwallower(rejectHandler)) {
          context.report({
            node,
            messageId: 'noAbortSwallower',
            data: {
              handler:
                rejectHandler.type === AST_NODE_TYPES.Identifier ? rejectHandler.name : 'handler',
            },
          })
          return
        }

        if (isEmptyFunction(rejectHandler)) {
          context.report({
            node,
            messageId: 'noEmptyThenReject',
          })
        }
      },
    }
  },
})
