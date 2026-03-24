import { command } from 'ccstate'
import type { RouteCommand } from '../../types/route-command.ts'

export const homeCommand$: RouteCommand = command(() => {
  return <div>Home Page</div>
})
