import { command } from 'ccstate'
import type { RouteCommand } from '../common/route-command.ts'

export function createHomePage() {
  const homeCommand$: RouteCommand = command(() => {
    return <div>Home Page</div>
  })
  return homeCommand$
}
