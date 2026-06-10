import { command, type Command } from 'ccstate'
import { detach, Reason } from './detach.ts'

/**
 * Bridges a React ref callback to a ccstate command with automatic AbortSignal lifecycle.
 *
 * On mount: creates an AbortController and invokes the command.
 * On unmount: aborts the controller automatically.
 */
export function onRef<T extends HTMLElement | SVGSVGElement>(
  command$: Command<void | Promise<void>, [T, AbortSignal]>,
) {
  return command(({ set }, el: T | null) => {
    if (!el) {
      return
    }

    const ctrl = new AbortController()

    detach(set(command$, el, ctrl.signal), Reason.DOM, 'onRef')

    return () => {
      ctrl.abort()
    }
  })
}
