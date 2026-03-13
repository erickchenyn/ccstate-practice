import { command, type Command } from 'ccstate'
import { detach, Reason } from './detach.ts'

/**
 * 将 React ref 回调桥接到 ccstate command，并自动管理 AbortSignal 生命周期
 *
 * 当 React 挂载元素时，创建 AbortController 并调用 command；
 * 当 React 卸载元素时，自动 abort。
 */
export function onRef<T extends HTMLElement | SVGSVGElement>(
  command$: Command<void | Promise<void>, [T, AbortSignal]>,
) {
  return command(({ set }, el: T | null) => {
    if (!el) {
      return
    }

    const ctrl = new AbortController()

    detach(set(command$, el, ctrl.signal), Reason.DomCallback, 'onRef')

    return () => {
      ctrl.abort()
    }
  })
}
