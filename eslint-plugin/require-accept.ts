import { AST_NODE_TYPES, type TSESTree } from '@typescript-eslint/utils'
import { createRule } from './utils.ts'

function isGetHttpClientCall(node: TSESTree.Node | null | undefined): boolean {
  return (
    node?.type === AST_NODE_TYPES.CallExpression &&
    node.callee.type === AST_NODE_TYPES.Identifier &&
    node.callee.name === 'get' &&
    node.arguments.length === 1 &&
    node.arguments[0].type === AST_NODE_TYPES.Identifier &&
    node.arguments[0].name === 'httpClient$'
  )
}

function isWrappedInAccept(node: TSESTree.CallExpression): boolean {
  const parent = node.parent
  return (
    parent?.type === AST_NODE_TYPES.CallExpression &&
    parent.callee.type === AST_NODE_TYPES.Identifier &&
    parent.callee.name === 'accept' &&
    parent.arguments[0] === node
  )
}

export const requireAccept = createRule({
  name: 'require-accept',
  defaultOptions: [],
  meta: {
    type: 'problem',
    docs: {
      description: 'require httpClient$ calls in signals to be wrapped in accept()',
    },
    schema: [],
    messages: {
      requireAccept: 'httpClient$ calls must be wrapped in `accept()`.',
    },
  },
  create(context) {
    const filename = (context.filename || context.getFilename()).replace(/\\/g, '/')
    if (
      filename !== '<input>' &&
      (!filename.includes('/src/signals/') || filename.includes('/__tests__/'))
    ) {
      return {}
    }

    const factoryVars = new Set<string>()
    const clientVars = new Set<string>()

    function isFactoryCall(node: TSESTree.Node | null | undefined): boolean {
      return (
        node?.type === AST_NODE_TYPES.CallExpression &&
        node.callee.type === AST_NODE_TYPES.Identifier &&
        factoryVars.has(node.callee.name)
      )
    }

    function isInlineClientFactoryCall(node: TSESTree.Node | null | undefined): boolean {
      if (node?.type !== AST_NODE_TYPES.CallExpression) {
        return false
      }
      if (isGetHttpClientCall(node.callee)) {
        return true
      }
      return node.callee.type === AST_NODE_TYPES.Identifier && factoryVars.has(node.callee.name)
    }

    return {
      VariableDeclarator(node: TSESTree.VariableDeclarator) {
        if (node.id.type !== AST_NODE_TYPES.Identifier) {
          return
        }

        if (isGetHttpClientCall(node.init)) {
          factoryVars.add(node.id.name)
          return
        }

        if (isFactoryCall(node.init) || isInlineClientFactoryCall(node.init)) {
          clientVars.add(node.id.name)
        }
      },

      CallExpression(node: TSESTree.CallExpression) {
        if (node.callee.type !== AST_NODE_TYPES.MemberExpression) {
          return
        }

        const object = node.callee.object
        const objectIsClient =
          (object.type === AST_NODE_TYPES.Identifier && clientVars.has(object.name)) ||
          isInlineClientFactoryCall(object)

        if (!objectIsClient || isWrappedInAccept(node)) {
          return
        }

        context.report({
          node,
          messageId: 'requireAccept',
        })
      },
    }
  },
})
