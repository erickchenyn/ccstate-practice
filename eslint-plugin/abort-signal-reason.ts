import { AST_NODE_TYPES, ESLintUtils, type TSESTree } from '@typescript-eslint/utils'
import { createRule } from './utils.ts'

export const abortSignalReason = createRule({
  name: 'abort-signal-reason',
  defaultOptions: [],
  meta: {
    type: 'problem',
    docs: {
      description:
        'abort() must be called with no arguments or a DOMException with name "AbortError". Prohibits variable passing to ensure type safety.',
      recommended: true,
      requiresTypeChecking: true,
    },
    schema: [],
    messages: {
      invalidAbortReason:
        'abort() must be called with no arguments or a DOMException with name "AbortError". Use: abort() or abort(new DOMException("reason", "AbortError"))',
      variableNotAllowed:
        'abort() requires inline DOMException, variables are not allowed. Please inline: abort(new DOMException("reason", "AbortError")) instead of extracting to a variable.',
      variableWrongType:
        'abort() argument has type "{{type}}" but requires DOMException. Variables are not allowed because we cannot verify the DOMException name property is "AbortError" at compile time.',
    },
  },
  create(context) {
    const services = ESLintUtils.getParserServices(context)
    const checker = services.program.getTypeChecker()

    function isAbortControllerOrSignalType(node: TSESTree.Expression): boolean {
      const tsNode = services.esTreeNodeToTSNodeMap.get(node)
      const type = checker.getTypeAtLocation(tsNode)
      const typeString = checker.typeToString(type)

      return (
        typeString === 'AbortController' ||
        typeString === 'AbortSignal' ||
        typeString === 'typeof AbortSignal'
      )
    }

    return {
      CallExpression(node: TSESTree.CallExpression) {
        if (node.callee.type !== AST_NODE_TYPES.MemberExpression) {
          return
        }

        const memberExpr = node.callee
        if (
          memberExpr.property.type !== AST_NODE_TYPES.Identifier ||
          memberExpr.property.name !== 'abort'
        ) {
          return
        }

        const isAbortSignalStatic =
          memberExpr.object.type === AST_NODE_TYPES.Identifier &&
          memberExpr.object.name === 'AbortSignal'

        if (!isAbortSignalStatic && !isAbortControllerOrSignalType(memberExpr.object)) {
          return
        }

        if (node.arguments.length === 0) {
          return
        }

        const arg = node.arguments[0]

        if (arg.type === AST_NODE_TYPES.NewExpression) {
          if (
            arg.callee.type === AST_NODE_TYPES.Identifier &&
            arg.callee.name === 'DOMException' &&
            arg.arguments.length >= 2
          ) {
            const secondArg = arg.arguments[1]
            if (
              secondArg.type === AST_NODE_TYPES.Literal &&
              typeof secondArg.value === 'string' &&
              secondArg.value === 'AbortError'
            ) {
              return
            }
          }
        }

        if (arg.type === AST_NODE_TYPES.Identifier) {
          const argTsNode = services.esTreeNodeToTSNodeMap.get(arg)
          const argType = checker.getTypeAtLocation(argTsNode)
          const argTypeString = checker.typeToString(argType)

          if (argTypeString !== 'DOMException') {
            context.report({
              node: arg,
              messageId: 'variableWrongType',
              data: { type: argTypeString },
            })
            return
          }

          context.report({
            node: arg,
            messageId: 'variableNotAllowed',
          })
          return
        }

        context.report({
          node: arg,
          messageId: 'invalidAbortReason',
        })
      },
    }
  },
})
