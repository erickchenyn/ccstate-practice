import { AST_NODE_TYPES, type TSESTree } from '@typescript-eslint/utils'
import { createRule } from './utils.ts'

export const commandAsyncSignal = createRule({
  name: 'command-async-signal',
  defaultOptions: [],
  meta: {
    type: 'problem',
    docs: {
      description: 'async commands must accept AbortSignal as their last parameter',
    },
    schema: [],
    messages: {
      missingSignal:
        'Async command must accept `signal: AbortSignal` as its last parameter for cancellation support',
      signalNotLast:
        'The `signal: AbortSignal` parameter must be the last parameter of an async command',
    },
  },
  create(context) {
    function isAbortSignalAnnotation(param: TSESTree.Parameter): boolean {
      if (param.type !== AST_NODE_TYPES.Identifier) {
        return false
      }
      const ann = param.typeAnnotation?.typeAnnotation
      return (
        ann !== undefined &&
        ann.type === AST_NODE_TYPES.TSTypeReference &&
        ann.typeName.type === AST_NODE_TYPES.Identifier &&
        ann.typeName.name === 'AbortSignal'
      )
    }

    function checkCommandCallback(
      node: TSESTree.ArrowFunctionExpression | TSESTree.FunctionExpression,
    ) {
      if (!node.async) {
        return
      }

      const userParams = node.params.slice(1)

      if (userParams.length === 0) {
        context.report({ node, messageId: 'missingSignal' })
        return
      }

      const lastParam = userParams[userParams.length - 1]
      if (!isAbortSignalAnnotation(lastParam)) {
        context.report({ node: lastParam, messageId: 'signalNotLast' })
      }
    }

    return {
      CallExpression(node: TSESTree.CallExpression) {
        if (node.callee.type !== AST_NODE_TYPES.Identifier || node.callee.name !== 'command') {
          return
        }

        const callback = node.arguments[0]
        if (!callback) {
          return
        }

        if (
          callback.type === AST_NODE_TYPES.ArrowFunctionExpression ||
          callback.type === AST_NODE_TYPES.FunctionExpression
        ) {
          checkCommandCallback(callback)
        }
      },
    }
  },
})
