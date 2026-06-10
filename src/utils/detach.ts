import { isAbortError, throwIfNotAbort } from './abort.ts'

export const Reason = {
  /** DOM event callback */
  DOM: 'dom',

  /** App root */
  Root: 'root',

  /** Deferred task */
  Deferred: 'deferred',

  /** Long-running background task that never resolves */
  Daemon: 'daemon',
} as const

export type Reason = (typeof Reason)[keyof typeof Reason]

const IN_VITEST = import.meta.env?.VITEST === 'true'

const collectedPromises = new Set<Promise<unknown>>()
const promiseReasons = new Map<Promise<unknown>, Reason>()
const promiseDescriptions = new Map<Promise<unknown>, string>()

export function detach<T>(promise: T | Promise<T>, reason: Reason, description?: string): void {
  if (!(promise instanceof Promise)) {
    return
  }

  const silencePromise = (async () => {
    try {
      // eslint-disable-next-line ccstate/signal-check-await
      await promise
      // eslint-disable-next-line ccstate/no-catch-abort
    } catch (error) {
      throwIfNotAbort(error)
    }
  })()

  if (IN_VITEST) {
    collectedPromises.add(silencePromise)
    promiseReasons.set(silencePromise, reason)
    if (description) {
      promiseDescriptions.set(silencePromise, description)
    }
  }
}

/**
 * Awaits all detached promises in tests.
 * Re-throws real errors (non-abort).
 */
export async function clearAllDetached(): Promise<void> {
  if (!IN_VITEST) {
    collectedPromises.clear()
    promiseReasons.clear()
    promiseDescriptions.clear()
    return
  }

  const errors: unknown[] = []

  for (const promise of collectedPromises) {
    try {
      // eslint-disable-next-line ccstate/signal-check-await
      await promise
      // eslint-disable-next-line ccstate/no-catch-abort
    } catch (error) {
      if (!isAbortError(error)) {
        errors.push(error)
      }
    }
  }

  collectedPromises.clear()
  promiseReasons.clear()
  promiseDescriptions.clear()

  if (errors.length > 0) {
    throw errors[0]
  }
}
