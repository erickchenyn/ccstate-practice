import { AST_NODE_TYPES, ESLintUtils, type TSESTree } from '@typescript-eslint/utils'
import type { Type } from 'typescript'
import { createRule } from './utils.ts'

export const noModuleLevelSignal = createRule({
  name: 'no-module-level-signal',
  defaultOptions: [],
  meta: {
    type: 'problem',
    docs: {
      description:
        'disallow module-level signal declarations, signals must be created inside a factory function',
      recommended: true,
      requiresTypeChecking: true,
    },
    schema: [],
    messages: {
      noModuleLevelSignal:
        'Signal "{{name}}" must not be declared at module level. Use a factory function to create signals within a specific scope.',
    },
  },
  create(context) {
    const services = ESLintUtils.getParserServices(context)
    const checker = services.program.getTypeChecker()

    const typeCache = new WeakMap<Type, boolean>()
    const signalTypeNames = new Set(['State', 'Command', 'Computed'])

    function isSignalType(type: Type): boolean {
      const cached = typeCache.get(type)
      if (cached !== undefined) {
        return cached
      }

      const symbol = type.getSymbol()
      if (!symbol) {
        typeCache.set(type, false)
        return false
      }

      const typeName = symbol.getName()
      if (!signalTypeNames.has(typeName)) {
        typeCache.set(type, false)
        return false
      }

      const declarations = symbol.getDeclarations()
      if (!declarations?.length) {
        typeCache.set(type, false)
        return false
      }

      const sourceFile = declarations[0].getSourceFile()
      const result = sourceFile.fileName.includes('ccstate')

      typeCache.set(type, result)
      return result
    }

    function isModuleLevel(node: TSESTree.VariableDeclarator): boolean {
      const declaration = node.parent
      if (declaration?.type !== AST_NODE_TYPES.VariableDeclaration) {
        return false
      }
      const parent = declaration.parent
      if (!parent) {
        return false
      }
      return (
        parent.type === AST_NODE_TYPES.Program ||
        parent.type === AST_NODE_TYPES.ExportNamedDeclaration ||
        parent.type === AST_NODE_TYPES.ExportDefaultDeclaration
      )
    }

    return {
      VariableDeclarator(node: TSESTree.VariableDeclarator) {
        if (node.id.type !== AST_NODE_TYPES.Identifier || !node.init) {
          return
        }

        if (!isModuleLevel(node)) {
          return
        }

        const tsNode = services.esTreeNodeToTSNodeMap.get(node.init)
        const type = checker.getTypeAtLocation(tsNode)

        if (isSignalType(type)) {
          context.report({
            node,
            messageId: 'noModuleLevelSignal',
            data: { name: node.id.name },
          })
        }
      },
    }
  },
})
