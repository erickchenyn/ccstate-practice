import { AST_NODE_TYPES, type TSESTree } from '@typescript-eslint/utils'
import { createRule } from './utils.ts'

function isCallLike(node: TSESTree.Expression): boolean {
  if (
    node.type === AST_NODE_TYPES.CallExpression ||
    node.type === AST_NODE_TYPES.NewExpression ||
    node.type === AST_NODE_TYPES.AwaitExpression ||
    node.type === AST_NODE_TYPES.MemberExpression
  ) {
    return true
  }
  if (node.type === AST_NODE_TYPES.ChainExpression) {
    return isCallLike(node.expression)
  }
  return false
}

export const noVoidStatement = createRule({
  name: 'no-void-statement',
  defaultOptions: [],
  meta: {
    type: 'problem',
    docs: {
      description: 'disallow statement-level `void <call>` — use detach() or await',
    },
    schema: [],
    messages: {
      noVoidStatement:
        'Do not use statement-level `void` to silence floating promises. Use `detach(<expr>, Reason.DOM)` from DOM callbacks, or `await` inside an async context.',
    },
  },
  create(context) {
    return {
      ExpressionStatement(node: TSESTree.ExpressionStatement) {
        const expr = node.expression
        if (expr.type !== AST_NODE_TYPES.UnaryExpression || expr.operator !== 'void') {
          return
        }
        if (!isCallLike(expr.argument)) {
          return
        }
        context.report({
          node: expr,
          messageId: 'noVoidStatement',
        })
      },
    }
  },
})
