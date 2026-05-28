import { command, computed, state, type Command, type Computed } from 'ccstate'

/**
 * 创建一个可重置的 AbortSignal 管理器
 *
 * 每次调用返回的 command 时，自动 abort 上一个 signal 并创建新的。
 * 常用于 Debounce、Tab 切换、页面导航等需要"取消上一次操作"的场景。
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
 * 在 resetSignal 基础上，额外暴露一个可读的当前 signal computed
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
