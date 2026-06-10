import { AST_NODE_TYPES, type TSESTree } from '@typescript-eslint/utils'
import { createRule } from './utils.ts'

export const layerBoundaries = createRule({
  name: 'layer-boundaries',
  defaultOptions: [],
  meta: {
    type: 'problem',
    docs: {
      description:
        'enforce layer separation: views/ allows only .tsx and must not import ccstate values; signals/ allows only .ts and must not import ccstate-react',
    },
    schema: [],
    messages: {
      viewsMustBeTsx: 'Files in views/ must be .tsx, got .ts: {{filename}}',
      signalsMustBeTs: 'Files in signals/ must be .ts, got .tsx: {{filename}}',
      noCcstateValueInViews:
        'views/ must not import value members from "ccstate". Use `import type` instead.',
      noCcstateReactInSignals: 'signals/ must not import from "ccstate-react".',
    },
  },
  create(context) {
    const filename = context.filename
    const inViews = filename.includes('/src/views/')
    const inSignals = filename.includes('/src/signals/')

    if (!inViews && !inSignals) {
      return {}
    }

    if (inViews && filename.endsWith('.ts') && !filename.endsWith('.tsx')) {
      context.report({
        loc: { line: 1, column: 0 },
        messageId: 'viewsMustBeTsx',
        data: { filename: filename.split('/').pop()! },
      })
    }

    if (inSignals && filename.endsWith('.tsx')) {
      context.report({
        loc: { line: 1, column: 0 },
        messageId: 'signalsMustBeTs',
        data: { filename: filename.split('/').pop()! },
      })
    }

    return {
      ImportDeclaration(node: TSESTree.ImportDeclaration) {
        const source = node.source.value

        if (inViews && source === 'ccstate') {
          if (node.importKind === 'type') {
            return
          }
          const hasValueSpecifier = node.specifiers.some(
            (s) => s.type === AST_NODE_TYPES.ImportSpecifier && s.importKind !== 'type',
          )
          if (hasValueSpecifier) {
            context.report({
              node,
              messageId: 'noCcstateValueInViews',
            })
          }
        }

        if (inSignals && source === 'ccstate-react') {
          context.report({
            node,
            messageId: 'noCcstateReactInSignals',
          })
        }
      },
    }
  },
})
