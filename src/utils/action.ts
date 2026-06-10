import { command, computed, state, type Command, type Computed } from 'ccstate'

/**
 * Creates a resettable AbortSignal manager.
 *
 * Each invocation aborts the previous signal and creates a new one.
 * Useful for debounce, tab switching, navigation, and other "cancel previous" patterns.
 */
export function resetSignal(): Command<AbortSignal, AbortSignal[]> {
  const controller$ = state<AbortController | undefined>(undefined)

  return command(({ get, set }, ...signals: AbortSignal[]) => {
    get(controller$)?.abort(new DOMException('reset signal', 'AbortError'))
    const controller = new AbortController()
    set(controller$, controller)

    return AbortSignal.any([controller.signal, ...signals])
  })
}

/**
 * Extends resetSignal by exposing a readable computed of the current signal.
 */
export function switchSignal(): {
  switch$: Command<AbortSignal, AbortSignal[]>
  signal$: Computed<AbortSignal>
} {
  const internalSwitch$ = resetSignal()
  const internalSignal$ = state<AbortSignal>(AbortSignal.abort())

  return {
    switch$: command(({ set }, ...signals: AbortSignal[]) => {
      const newSignal = set(internalSwitch$, ...signals)
      set(internalSignal$, newSignal)
      return newSignal
    }),
    signal$: computed((get) => {
      // eslint-disable-next-line ccstate/no-get-signal
      return get(internalSignal$)
    }),
  }
}
