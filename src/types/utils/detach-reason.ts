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
