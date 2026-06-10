import { command } from 'ccstate'
import type { RouteCommand } from '../route-command.ts'
import ColumnsPage from '../../views/columns-page.tsx'
import { createColumnsPageContext } from '../../signals/columns-page.ts'

export function createColumnsPage() {
  const columnsCommand$: RouteCommand = command(() => {
    const ctx = createColumnsPageContext()
    return <ColumnsPage ctx={ctx} />
  })
  return columnsCommand$
}
