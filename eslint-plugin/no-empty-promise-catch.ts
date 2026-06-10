import { AST_NODE_TYPES, type TSESTree } from '@typescript-eslint/utils'
import { createRule } from './utils.ts'

function isEmptyFunction(node: TSESTree.Expression | TSESTree.SpreadElement): boolean {
  if (
    node.type === AST_NODE_TYPES.ArrowFunctionExpression ||
    node.type === AST_NODE_TYPES.FunctionExpression
  ) {
    return node.body.type === AST_NODE_TYPES.BlockStatement && node.body.body.length === 0
  }
  return false
}

export const noEmptyPromiseCatch = createRule({
  name: 'no-empty-promise-catch',
  defaultOptions: [],
  meta: {
    type: 'problem',
    docs: {
      description: 'disallow .catch(() => {}) on promises — use detach() instead',
    },
    schema: [],
    messages: {
      noEmptyPromiseCatch:
        'Do not use .catch(() => {}) to silence floating promises. Use detach(promise, Reason.DOM) to properly track the promise for cleanup.',
    },
  },
  create(context) {
    return {
      CallExpression(node: TSESTree.CallExpression) {
        if (
          node.callee.type !== AST_NODE_TYPES.MemberExpression ||
          node.callee.property.type !== AST_NODE_TYPES.Identifier ||
          node.callee.property.name !== 'catch'
        ) {
          return
        }

        if (node.arguments.length !== 1 || !isEmptyFunction(node.arguments[0])) {
          return
        }

        context.report({
          node,
          messageId: 'noEmptyPromiseCatch',
        })
      },
    }
  },
})
