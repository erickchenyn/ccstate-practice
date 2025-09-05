export function parallel<T extends readonly unknown[]>(
    signal: AbortSignal,
    ...promises: T
): Promise<{ -readonly [P in keyof T]: Awaited<T[P]> }> {
    const ret = Promise.all(promises)
    signal.throwIfAborted()
    return ret
}
