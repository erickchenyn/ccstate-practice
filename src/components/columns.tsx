import { command } from 'ccstate'
import type { RouteCommand } from '../common/route-command.ts'
import ColumnsPage from './columns-page.tsx'

export const columnsCommand$: RouteCommand = command(() => {
  return <ColumnsPage />
})
