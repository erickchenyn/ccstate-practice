import { AST_NODE_TYPES, type TSESTree } from '@typescript-eslint/utils'
import { createRule } from './utils.ts'

interface FunctionContext {
  readonly signalName: string
  readonly signalAliases: Set<string>
  readonly factoryVars: Set<string>
  readonly clientVars: Set<string>
}

type CallbackNode = TSESTree.ArrowFunctionExpression | TSESTree.FunctionExpression
type FunctionNode = CallbackNode | TSESTree.FunctionDeclaration

function isAbortSignalParam(param: TSESTree.Parameter): param is TSESTree.Identifier {
  if (param.type !== AST_NODE_TYPES.Identifier) {
    return false
  }

  const annotation = param.typeAnnotation?.typeAnnotation
  return (
    annotation?.type === AST_NODE_TYPES.TSTypeReference &&
    annotation.typeName.type === AST_NODE_TYPES.Identifier &&
    annotation.typeName.name === 'AbortSignal'
  )
}

function getSignalName(node: FunctionNode): string | null {
  for (const param of node.params) {
    if (isAbortSignalParam(param)) {
      return param.name
    }
  }
  return null
}

function isComputedCallback(node: FunctionNode): boolean {
  return (
    node.parent?.type === AST_NODE_TYPES.CallExpression &&
    node.parent.callee.type === AST_NODE_TYPES.Identifier &&
    node.parent.callee.name === 'computed'
  )
}

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

function getProperty(node: TSESTree.ObjectExpression, name: string): TSESTree.Property | null {
  for (const prop of node.properties) {
    if (
      prop.type === AST_NODE_TYPES.Property &&
      !prop.computed &&
      prop.key.type === AST_NODE_TYPES.Identifier &&
      prop.key.name === name
    ) {
      return prop
    }
  }
  return null
}

function getFetchOptionsSignalName(node: TSESTree.Property['value']): string | null {
  if (node.type !== AST_NODE_TYPES.ObjectExpression) {
    return null
  }

  const signalProp = getProperty(node, 'signal')
  if (!signalProp) {
    return null
  }
  if (signalProp.value.type === AST_NODE_TYPES.Identifier) {
    return signalProp.value.name
  }
  return null
}

export const requireClientSignal = createRule({
  name: 'require-client-signal',
  defaultOptions: [],
  meta: {
    type: 'problem',
    docs: {
      description:
        'require httpClient$ calls inside async signal-bearing functions to pass fetchOptions.signal',
    },
    schema: [],
    messages: {
      missingFetchOptions:
        'httpClient$ calls in async signal-bearing functions must pass `fetchOptions: { {{signalName}} }`.',
      missingSignal:
        'httpClient$ calls in async signal-bearing functions must pass `fetchOptions.signal` using `{{signalName}}`.',
      wrongSignal:
        'httpClient$ calls in async signal-bearing functions must pass the current signal `{{signalName}}` as `fetchOptions.signal`.',
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

    const functionStack: Array<FunctionContext | null> = []

    function currentFunction(): FunctionContext | null {
      return functionStack[functionStack.length - 1] ?? null
    }

    function isFactoryCall(
      node: TSESTree.Node | null | undefined,
      current: FunctionContext,
    ): boolean {
      return (
        node?.type === AST_NODE_TYPES.CallExpression &&
        node.callee.type === AST_NODE_TYPES.Identifier &&
        current.factoryVars.has(node.callee.name)
      )
    }

    function isInlineClientFactoryCall(
      node: TSESTree.Node | null | undefined,
      current: FunctionContext,
    ): boolean {
      if (node?.type !== AST_NODE_TYPES.CallExpression) {
        return false
      }
      if (isGetHttpClientCall(node.callee)) {
        return true
      }
      return (
        node.callee.type === AST_NODE_TYPES.Identifier && current.factoryVars.has(node.callee.name)
      )
    }

    function checkClientCall(node: TSESTree.CallExpression, current: FunctionContext) {
      const firstArg = node.arguments[0]
      if (!firstArg || firstArg.type !== AST_NODE_TYPES.ObjectExpression) {
        context.report({
          node,
          messageId: 'missingFetchOptions',
          data: { signalName: current.signalName },
        })
        return
      }

      const fetchOptions = getProperty(firstArg, 'fetchOptions')
      if (!fetchOptions || fetchOptions.value.type !== AST_NODE_TYPES.ObjectExpression) {
        context.report({
          node: firstArg,
          messageId: 'missingFetchOptions',
          data: { signalName: current.signalName },
        })
        return
      }

      const signalName = getFetchOptionsSignalName(fetchOptions.value)
      if (!signalName) {
        context.report({
          node: fetchOptions.value,
          messageId: 'missingSignal',
          data: { signalName: current.signalName },
        })
        return
      }

      if (!current.signalAliases.has(signalName)) {
        context.report({
          node: fetchOptions.value,
          messageId: 'wrongSignal',
          data: { signalName: current.signalName },
        })
      }
    }

    function enterFunction(node: FunctionNode) {
      if (!node.async || isComputedCallback(node)) {
        functionStack.push(null)
        return
      }

      const signalName = getSignalName(node)
      if (!signalName) {
        functionStack.push(null)
        return
      }

      functionStack.push({
        signalName,
        signalAliases: new Set([signalName]),
        factoryVars: new Set(),
        clientVars: new Set(),
      })
    }

    function exitFunction() {
      functionStack.pop()
    }

    return {
      FunctionDeclaration: enterFunction,
      'FunctionDeclaration:exit': exitFunction,
      ArrowFunctionExpression: enterFunction,
      'ArrowFunctionExpression:exit': exitFunction,
      FunctionExpression: enterFunction,
      'FunctionExpression:exit': exitFunction,

      VariableDeclarator(node: TSESTree.VariableDeclarator) {
        const current = currentFunction()
        if (!current || node.id.type !== AST_NODE_TYPES.Identifier) {
          return
        }

        if (
          node.init?.type === AST_NODE_TYPES.Identifier &&
          current.signalAliases.has(node.init.name)
        ) {
          current.signalAliases.add(node.id.name)
          return
        }

        if (isGetHttpClientCall(node.init)) {
          current.factoryVars.add(node.id.name)
          return
        }

        if (isFactoryCall(node.init, current) || isInlineClientFactoryCall(node.init, current)) {
          current.clientVars.add(node.id.name)
        }
      },

      CallExpression(node: TSESTree.CallExpression) {
        const current = currentFunction()
        if (!current || node.callee.type !== AST_NODE_TYPES.MemberExpression) {
          return
        }

        const object = node.callee.object
        const objectIsClient =
          (object.type === AST_NODE_TYPES.Identifier && current.clientVars.has(object.name)) ||
          isInlineClientFactoryCall(object, current)

        if (!objectIsClient) {
          return
        }

        checkClientCall(node, current)
      },
    }
  },
})
