import { command } from 'ccstate'
import type { RouteCommand } from '../common/route-command.ts'
import ColumnsPage from './columns-page.tsx'
import { createColumnsPageContext } from './columns-page-context.ts'

export function createColumnsPage() {
  const columnsCommand$: RouteCommand = command(() => {
    const ctx = createColumnsPageContext()
    return <ColumnsPage ctx={ctx} />
  })
  return columnsCommand$
}
