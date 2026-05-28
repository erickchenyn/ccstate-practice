import { isAbortError, throwIfNotAbort } from './abort.ts'

export const Reason = {
  /** DOM 事件回调 */
  DOM: 'dom',

  /** app 根节点 */
  Root: 'root',

  /** 延迟执行的任务 */
  Deferred: 'deferred',

  /** 永不 resolve 的后台任务 */
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
 * 在测试中等待所有 detach 的 promise 完成，
 * 如果有真实错误（非 abort）会重新抛出
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
