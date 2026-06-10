/**
 * Determines whether an error is an AbortError caused by signal abortion.
 *
 * Some network protocol errors (e.g. ERR_QUIC_PROTOCOL_ERROR) are tagged as
 * name='AbortError' in browsers, so strict type checking is needed to avoid false positives.
 */
export function isAbortError(error: unknown): boolean {
  if (error instanceof DOMException && error.name === 'AbortError') {
    return true
  }

  if (error instanceof Error && error.name === 'AbortError') {
    if (error.message === '' || error.message.startsWith('AbortError:')) {
      return true
    }
  }

  if (error instanceof Event && error.type === 'abort' && error.target instanceof AbortSignal) {
    return true
  }

  return false
}

/**
 * Re-throws if the error is an AbortError, letting callers handle cancellation.
 */
export function throwIfAbort(error: unknown): void {
  if (isAbortError(error)) {
    throw error
  }
}

/**
 * Re-throws if the error is NOT an AbortError — silences cancellation but surfaces real errors.
 */
export function throwIfNotAbort(error: unknown): void {
  if (!isAbortError(error)) {
    throw error
  }
}
