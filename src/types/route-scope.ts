import type { Command, Computed } from 'ccstate'
import type { RouteCommand } from './route-command'
import type { ReactNode } from 'react'

export interface RouteScope {
  readonly navigateToRoute$: Command<Promise<void>, [RouteCommand, AbortSignal]>
  readonly renderedNode$: Computed<ReactNode>
  readonly routeLoading$: Computed<boolean>
  readonly routeError$: Computed<string | null>
}
