/**
 * 判断一个错误是否为 signal abort 导致的 AbortError
 *
 * 某些网络协议错误（如 ERR_QUIC_PROTOCOL_ERROR）在浏览器中会被标记为 name='AbortError'，
 * 因此需要严格判断类型来避免误判
 */
export function isAbortError(error: unknown): boolean {
  // 标准的 AbortController abort
  if (error instanceof DOMException && error.name === 'AbortError') {
    return true
  }

  // signal-timers 库的 AbortError
  if (error instanceof Error && error.name === 'AbortError') {
    if (error.message === '' || error.message.startsWith('AbortError:')) {
      return true
    }
  }

  // AbortSignal 的原生 abort Event 对象
  if (error instanceof Event && error.type === 'abort' && error.target instanceof AbortSignal) {
    return true
  }

  return false
}

/**
 * 如果是 abort 错误则重新抛出，让上层处理取消逻辑
 */
export function throwIfAbort(error: unknown): void {
  if (isAbortError(error)) {
    throw error
  }
}

/**
 * 如果不是 abort 错误则重新抛出，静默处理取消但不吞掉真实错误
 */
export function throwIfNotAbort(error: unknown): void {
  if (!isAbortError(error)) {
    throw error
  }
}
