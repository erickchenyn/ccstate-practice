import { command, computed, state, type Command, type Computed } from 'ccstate'

/**
 * Creates a key-scoped state. When the key does not match, value$ returns initial and set$ silently discards writes.
 *
 * ## Behavior
 *
 * - value$: returns data.value when `data.key === get(key$)`, otherwise returns initial
 * - set$: writes are silently discarded when `get(key$)` is undefined
 * - Only one copy of data is stored — writing with key B discards data for key A
 *
 * ## Correct usage: user interaction state
 *
 * Values originating from user actions (clicks, input) whose validity depends on a context ID
 * (e.g., should become stale after workspace/file switches).
 * The key guard ensures the initial value is returned automatically when context mismatches,
 * so no manual reset is needed.
 *
 * Example: a user expands a commit diff in the commit history dialog; after switching to another
 * file, the expanded state should reset — keyedState(targetKey$) handles this automatically.
 *
 * ## Common misuse: API data
 *
 * If a value is entirely derived from a context ID (e.g., a notification list keyed by workspaceId),
 * use async computed instead of keyedState:
 *
 * ```ts
 * // ❌ Misuse: storing API data in keyedState
 * const { value$, set$ } = keyedState(contextId$, null)
 * const fetchData$ = command(async ({ get, set }, signal) => {
 *     const data = await fetch(url, { signal })
 *     set(set$, data)  // manual fetch → manual set
 * })
 *
 * // ✅ Correct: async computed auto-refetches and aborts when context changes
 * const data$ = computed(async (get, { signal }) => {
 *     const id = get(contextId$)
 *     if (!id) return null
 *     return await fetchData(id, signal)
 * })
 * ```
 *
 * **How to decide**: ask "can this value be derived from the context ID?"
 * - if yes, use async computed;
 * - if not (value comes from unpredictable user actions), use keyedState.
 */
export function keyedState<T>(
  key$: Computed<string | undefined>,
  initial: T,
): {
  value$: Computed<T>
  set$: Command<void, [T]>
} {
  const internal$ = state<{ key: string; value: T } | null>(null)

  return {
    value$: computed((get) => {
      const data = get(internal$)
      const key = get(key$)
      if (!data || !key || data.key !== key) {
        return initial
      }
      return data.value
    }),
    set$: command(({ get, set }, value: T) => {
      const key = get(key$)
      if (!key) {
        return
      }
      set(internal$, { key, value })
    }),
  }
}

/**
 * Creates a key-scoped session (open/update/close semantics).
 * See the keyedState comment for correct usage and common misuse.
 */
export function keyedSession<T>(key$: Computed<string | undefined>): {
  session$: Computed<T | null>
  open$: Command<void, [T]>
  update$: Command<void, [(prev: T) => T]>
  close$: Command<void, []>
} {
  const internal$ = state<{ key: string; session: T } | null>(null)

  return {
    session$: computed((get) => {
      const data = get(internal$)
      const key = get(key$)
      if (!data || !key || data.key !== key) {
        return null
      }
      return data.session
    }),
    open$: command(({ get, set }, session: T) => {
      const key = get(key$)
      if (!key) {
        return
      }
      set(internal$, { key, session })
    }),
    update$: command(({ get, set }, updater: (prev: T) => T) => {
      const data = get(internal$)
      const key = get(key$)
      if (!data || !key || data.key !== key) {
        return
      }
      set(internal$, { ...data, session: updater(data.session) })
    }),
    close$: command(({ get, set }) => {
      const data = get(internal$)
      const key = get(key$)
      if (!data || !key || data.key !== key) {
        return
      }
      set(internal$, null)
    }),
  }
}
