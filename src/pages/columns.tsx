import { command } from 'ccstate'
import type { RouteCommand } from '../utils/route-command.ts'
import ColumnsPage from './columns-page.tsx'

export const columnsCommand$: RouteCommand = command(() => {
  return <ColumnsPage />
})
