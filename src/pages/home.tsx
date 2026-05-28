import { command } from 'ccstate'
import type { RouteCommand } from '../utils/route-command.ts'

export const homeCommand$: RouteCommand = command(() => {
  return <div>Home Page</div>
})
