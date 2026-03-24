import { createRule } from './utils.ts'

const MODULES = ['signals', 'views'] as const

function getModule(filePath: string): (typeof MODULES)[number] | null {
  for (const mod of MODULES) {
    if (filePath.includes(`/src/${mod}/`) || filePath.includes(`\\src\\${mod}\\`)) {
      return mod
    }
  }
  return null
}

function getImportModule(importSource: string): (typeof MODULES)[number] | null {
  for (const mod of MODULES) {
    if (
      importSource.includes(`/${mod}/`) ||
      importSource.startsWith(`../${mod}/`) ||
      importSource.startsWith(`./${mod}/`)
    ) {
      return mod
    }
  }
  return null
}

const FORBIDDEN_PAIRS: Record<string, string[]> = {
  signals: ['views'],
  views: ['signals'],
}

export const moduleImports = createRule({
  name: 'module-imports',
  defaultOptions: [],
  meta: {
    type: 'problem',
    docs: {
      description: 'enforce import boundaries between signals and views modules',
    },
    schema: [],
    messages: {
      forbidden: '{{sourceModule}} module must not import from {{targetModule}} module',
    },
  },
  create(context) {
    const filePath = context.filename
    const sourceModule = getModule(filePath)

    if (!sourceModule) {
      return {}
    }

    const forbidden = FORBIDDEN_PAIRS[sourceModule]
    if (!forbidden) {
      return {}
    }

    return {
      ImportDeclaration(node) {
        const importSource = node.source.value
        const targetModule = getImportModule(importSource)

        if (targetModule && forbidden.includes(targetModule)) {
          context.report({
            node: node.source,
            messageId: 'forbidden',
            data: { sourceModule, targetModule },
          })
        }
      },
    }
  },
})
