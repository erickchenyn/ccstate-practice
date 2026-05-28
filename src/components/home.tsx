import { command } from 'ccstate'
import type { RouteCommand } from '../common/route-command.ts'

export const homeCommand$: RouteCommand = command(() => {
  return <div>Home Page</div>
})
