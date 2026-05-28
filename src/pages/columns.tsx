import { command } from 'ccstate'
import type { RouteCommand } from '../types/route-command.ts'
import ColumnsPage from './columns-page.tsx'

export const columnsCommand$: RouteCommand = command(() => {
  return <ColumnsPage />
})
