import { type ReactNode } from 'react'
import { command, computed, state, type Command, type Computed } from 'ccstate'
import { switchSignal } from './action.ts'
import { throwIfAbort } from './abort.ts'
import type { RouteCommand } from './route-command.ts'

export interface RouteScope {
  readonly navigateToRoute$: Command<Promise<void>, [RouteCommand, AbortSignal]>
  readonly renderedNode$: Computed<ReactNode>
  readonly routeLoading$: Computed<boolean>
  readonly routeError$: Computed<string | null>
}

export const createRouteScope$ = command(() => {
  const switchRouteSignal = switchSignal()

  const internalRenderedNode$ = state<ReactNode>(null)
  const internalLoading$ = state(false)
  const internalError$ = state<string | null>(null)

  return {
    navigateToRoute$: command(
      async (
        { set },
        routeCommand$: Command<ReactNode, [AbortSignal]>,
        routeSignal: AbortSignal,
      ) => {
        const signal = set(switchRouteSignal.switch$, routeSignal)

        set(internalLoading$, true)
        set(internalError$, null)
        set(internalRenderedNode$, null)

        try {
          const node = await set(routeCommand$, signal)
          signal.throwIfAborted()
          set(internalRenderedNode$, node)
        } catch (error) {
          throwIfAbort(error)
          set(internalError$, String(error))
        } finally {
          set(internalLoading$, false)
        }
      },
    ),
    renderedNode$: computed((get) => get(internalRenderedNode$)),
    routeLoading$: computed((get) => get(internalLoading$)),
    routeError$: computed((get) => get(internalError$)),
  } as const
})
