import { detach, Reason } from './detach.ts'

/**
 * 创建可外部 resolve/reject 的 Promise，绑定到 AbortSignal 生命周期
 */
export function createDeferredPromise<T>(signal: AbortSignal): {
  promise: Promise<T>
  resolve: (value: T) => void
  reject: (reason?: unknown) => void
  settled: () => boolean
} {
  let _resolve: ((value: T) => void) | undefined
  let _reject: ((reason?: unknown) => void) | undefined
  let settled = false

  const promise = new Promise<T>((resolve, reject) => {
    _resolve = (value: T) => {
      if (settled) {
        throw new Error('Deferred promise already settled')
      }
      settled = true
      resolve(value)
    }
    _reject = (reason?: unknown) => {
      if (settled) {
        throw new Error('Deferred promise already settled')
      }
      settled = true
      reject(reason)
    }
  })

  detach(promise, Reason.Deferred)

  signal.addEventListener('abort', () => {
    if (!settled) {
      _reject?.(signal.reason)
    }
  })

  return {
    promise,
    resolve: _resolve as (value: T) => void,
    reject: _reject as (reason?: unknown) => void,
    settled: () => settled,
  }
}

/**
 * 带 signal 检查的 Promise.all 包装
 */
export function parallel<T extends readonly unknown[]>(
  signal: AbortSignal,
  ...promises: T
): Promise<{ -readonly [P in keyof T]: Awaited<T[P]> }> {
  const ret = Promise.all(promises)
  signal.throwIfAborted()
  return ret
}
