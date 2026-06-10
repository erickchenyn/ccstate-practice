import { command } from 'ccstate'
import type { RouteCommand } from '../route-command.ts'
import { delay } from 'signal-timers'

export function createAboutPage() {
  const aboutCommand$: RouteCommand = command(async (_, signal: AbortSignal) => {
    await delay(1000, { signal })
    signal.throwIfAborted()

    return <div>About Page (loaded async)</div>
  })
  return aboutCommand$
}
