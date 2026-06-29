import { createRule } from './utils.ts'

function normalizedFilename(filename: string): string {
  return filename.replace(/\\/g, '/')
}

function isTestFile(filename: string): boolean {
  const basename = filename.split('/').pop() ?? filename
  return /\.test\.[^.]+$/.test(basename)
}

function isDirectlyInsideTestsDir(filename: string): boolean {
  const parts = filename.split('/')
  return parts[parts.length - 2] === '__tests__'
}

export const testFilesInTestsDir = createRule({
  name: 'test-files-in-tests-dir',
  defaultOptions: [],
  meta: {
    type: 'problem',
    docs: {
      description: 'require *.test.* files to live directly inside a __tests__ directory',
    },
    schema: [],
    messages: {
      testOutsideTestsDir:
        'Test file "{{filename}}" must be placed directly inside a "__tests__" directory.',
    },
  },
  create(context) {
    const filename = normalizedFilename(context.filename || context.getFilename())

    if (!isTestFile(filename) || isDirectlyInsideTestsDir(filename)) {
      return {}
    }

    return {
      Program(node) {
        context.report({
          node,
          messageId: 'testOutsideTestsDir',
          data: { filename: filename.split('/').pop() ?? filename },
        })
      },
    }
  },
})
