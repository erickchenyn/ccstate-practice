import { AST_NODE_TYPES, type TSESTree } from '@typescript-eslint/utils'
import { createRule } from './utils.ts'

type FunctionNode =
  | TSESTree.FunctionDeclaration
  | TSESTree.ArrowFunctionExpression
  | TSESTree.FunctionExpression

type Options = [
  {
    forbiddenCalls?: string[]
  }?,
]

function isPascalCase(name: string): boolean {
  return /^[A-Z]/.test(name)
}

function isComponentFunction(node: FunctionNode, filename: string): boolean {
  if (node.type === AST_NODE_TYPES.FunctionDeclaration && node.id) {
    return isPascalCase(node.id.name)
  }

  if (
    node.parent?.type === AST_NODE_TYPES.VariableDeclarator &&
    node.parent.id.type === AST_NODE_TYPES.Identifier
  ) {
    return isPascalCase(node.parent.id.name)
  }

  return (
    filename.endsWith('.tsx') &&
    node.type === AST_NODE_TYPES.FunctionDeclaration &&
    node.parent?.type === AST_NODE_TYPES.ExportDefaultDeclaration
  )
}

export const noSideEffectInRender = createRule<Options, string>({
  name: 'no-side-effect-in-render',
  defaultOptions: [{}],
  meta: {
    type: 'problem',
    docs: {
      description: 'disallow calling side-effect functions directly in React render bodies',
    },
    schema: [
      {
        type: 'object',
        properties: {
          forbiddenCalls: {
            type: 'array',
            items: { type: 'string' },
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      noSetInRender:
        'Do not call a useSet() setter directly during render. Move the call into an event handler or effect callback.',
      noSideEffectInRender:
        'Do not call `{{name}}()` directly during render. Move side effects into event handlers or effect callbacks.',
    },
  },
  create(context, [options]) {
    const filename = (context.filename || context.getFilename()).replace(/\\/g, '/')
    const forbiddenCalls = new Set(options?.forbiddenCalls ?? ['detach', 'queueMicrotask'])
    const renderScopeStack: boolean[] = []
    const setterNamesStack: Set<string>[] = []

    function isInRenderScope(): boolean {
      return renderScopeStack[renderScopeStack.length - 1] === true
    }

    function currentSetterNames(): Set<string> | undefined {
      return setterNamesStack[setterNamesStack.length - 1]
    }

    function enterFunction(node: FunctionNode) {
      const isComponent = isComponentFunction(node, filename)
      renderScopeStack.push(isComponent)
      if (isComponent) {
        setterNamesStack.push(new Set())
      }
    }

    function exitFunction() {
      const wasComponent = renderScopeStack.pop()
      if (wasComponent) {
        setterNamesStack.pop()
      }
    }

    return {
      FunctionDeclaration: enterFunction,
      'FunctionDeclaration:exit': exitFunction,
      ArrowFunctionExpression: enterFunction,
      'ArrowFunctionExpression:exit': exitFunction,
      FunctionExpression: enterFunction,
      'FunctionExpression:exit': exitFunction,

      VariableDeclarator(node: TSESTree.VariableDeclarator) {
        if (!isInRenderScope()) {
          return
        }

        if (
          node.id.type === AST_NODE_TYPES.Identifier &&
          node.init?.type === AST_NODE_TYPES.CallExpression &&
          node.init.callee.type === AST_NODE_TYPES.Identifier &&
          node.init.callee.name === 'useSet'
        ) {
          currentSetterNames()?.add(node.id.name)
        }
      },

      CallExpression(node: TSESTree.CallExpression) {
        if (!isInRenderScope() || node.callee.type !== AST_NODE_TYPES.Identifier) {
          return
        }

        const name = node.callee.name
        if (currentSetterNames()?.has(name)) {
          context.report({
            node,
            messageId: 'noSetInRender',
          })
          return
        }

        if (!forbiddenCalls.has(name)) {
          return
        }

        context.report({
          node,
          messageId: 'noSideEffectInRender',
          data: { name },
        })
      },
    }
  },
})
