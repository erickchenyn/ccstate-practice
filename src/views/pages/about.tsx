import { command } from 'ccstate'
import type { RouteCommand } from '../../types/route-command.ts'
import { delay } from 'signal-timers'

export const aboutCommand$: RouteCommand = command(async (_, signal: AbortSignal) => {
  await delay(1000, { signal })
  signal.throwIfAborted()

  return <div>About Page (loaded async)</div>
})
