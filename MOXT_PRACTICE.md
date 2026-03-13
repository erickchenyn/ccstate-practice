# MoXT 项目 ccstate 实践总结

本文档总结了 MoXT 项目中 ccstate 的使用方法、工具函数、ESLint 规则和代码实践，提炼出可复用的 pattern。

## 目录

- [1. 基础概念](#1-基础概念)
- [2. 命名规范](#2-命名规范)
- [3. 核心 Pattern](#3-核心-pattern)
- [4. React 集成](#4-react-集成)
- [5. AbortSignal 生命周期管理](#5-abortsignal-生命周期管理)
- [6. 工具函数](#6-工具函数)
- [7. Floating Promise 处理](#7-floating-promise-处理)
- [8. 异步模式](#8-异步模式)
- [9. ESLint 规则](#9-eslint-规则)
- [10. 测试模式](#10-测试模式)
- [11. 项目结构](#11-项目结构)
- [12. Babel 集成](#12-babel-集成)

---

## 1. 基础概念

ccstate 提供三种核心原语：

| 原语                                      | 作用                   | 类比                 |
| ----------------------------------------- | ---------------------- | -------------------- |
| `state(initialValue)`                     | 可读可写的状态单元     | React 的 `useState`  |
| `computed((get) => ...)`                  | 派生状态，依赖自动追踪 | React 的 `useMemo`   |
| `command(({ get, set }, ...args) => ...)` | 副作用操作，可读可写   | React 的事件处理函数 |

```typescript
import { state, computed, command } from 'ccstate'

const count$ = state(0)
const doubled$ = computed((get) => get(count$) * 2)
const increment$ = command(({ get, set }) => {
  set(count$, get(count$) + 1)
})
```

---

## 2. 命名规范

### 2.1 `$` 后缀（强制）

所有 ccstate 信号变量**必须**以 `$` 结尾，由 ESLint 规则 `signal-dollar-suffix` 强制执行：

```typescript
// ✅ 正确
const count$ = state(0)
const doubled$ = computed((get) => get(count$) * 2)
const increment$ = command(({ set }) => { ... })

// ❌ 错误
const count = state(0)
const doubled = computed((get) => get(count$) * 2)
```

### 2.2 `internal` / `inner` 前缀

私有状态使用 `internal` 或 `inner` 前缀，不导出，通过 `computed` 和 `command` 暴露公共接口：

```typescript
// 私有，不导出
const internalCount$ = state(0)

// 公共只读
export const count$ = computed((get) => get(internalCount$))

// 公共写入
export const setCount$ = command(({ set }, value: number) => {
  set(internalCount$, value)
})
```

---

## 3. 核心 Pattern

### 3.1 Encapsulation Pattern（封装模式）

**核心原则**：State 不导出，只通过 Computed 和 Command 暴露公共 API。

```typescript
// ❌ 错误：直接导出 state（ESLint 规则 no-export-state 禁止）
export const users$ = state<User[]>([])

// ✅ 正确：封装访问
const internalUsers$ = state<User[]>([])

export const users$ = computed((get) => get(internalUsers$))
export const addUser$ = command(({ set }, user: User) => {
  set(internalUsers$, (prev) => [...prev, user])
})
```

**为什么**：确保状态变更只能通过受控的 command 进行，防止外部直接修改内部状态。

### 3.2 Factory Pattern（工厂模式）

使用工厂函数创建可复用的状态模块：

```typescript
function createCounter(initialValue = 0) {
  const internalCount$ = state(initialValue)

  return {
    count$: computed((get) => get(internalCount$)),
    increment$: command(({ get, set }) => {
      set(internalCount$, get(internalCount$) + 1)
    }),
    reset$: command(({ set }) => {
      set(internalCount$, initialValue)
    }),
  } as const
}

// 每次调用创建独立的状态实例
const counterA = createCounter(0)
const counterB = createCounter(10)
```

**实际案例** — `createDelayBooleanSwitch`（开关状态 + 延迟关闭）：

```typescript
function createDelayBooleanSwitch() {
  let controller = new AbortController()
  const internalBooleanState$ = state<boolean>(false)

  const booleanState$ = computed((get) => get(internalBooleanState$))

  const updateBooleanState$ = command(({ set }, nextValue: boolean, delay?: number) => {
    controller.abort()
    if (delay) {
      controller = new AbortController()
      timeout(
        () => {
          set(internalBooleanState$, nextValue)
        },
        delay,
        { signal: controller.signal },
      )
    } else {
      set(internalBooleanState$, nextValue)
    }
  })

  return { booleanState$, updateBooleanState$ } as const
}
```

### 3.3 Store Module Pattern（模块化 Store）

将相关的状态、计算属性和命令组合成一个模块，内部使用 factory 组合：

```typescript
function createWorkspaceStore() {
  const internal = createInternalState()
  const inputCtx = createInputContext<string>('')

  const reads = createReadComputeds(internal)
  const commands = createWriteCommands(internal, inputCtx)

  return {
    ...reads,
    ...commands,
    newName: inputCtx,
  } as const
}

export const workspaceStore = createWorkspaceStore()
```

### 3.4 Reload Trigger Pattern（重载触发器）

使用一个简单的 `state(0)` 作为缓存失效/重新加载的触发器：

```typescript
const internalReloadTrigger$ = state(0)

const data$ = computed(async (get) => {
  get(internalReloadTrigger$) // 订阅触发器，值本身不重要
  return await fetchData()
})

export const reload$ = command(({ set }) => {
  set(internalReloadTrigger$, (prev) => prev + 1) // 触发重新计算
})
```

### 3.5 Updater Function Pattern（更新函数模式）

`set` 支持传入更新函数，基于前一个值计算新值：

```typescript
const items$ = state<Item[]>([])

const addItem$ = command(({ set }, item: Item) => {
  set(items$, (prev) => [...prev, item])
})

const removeItem$ = command(({ set }, id: string) => {
  set(items$, (prev) => prev.filter((item) => item.id !== id))
})
```

### 3.6 Conditional Computed Pattern（条件计算）

computed 中根据依赖值提前返回：

```typescript
const selectedId$ = state<string | undefined>(undefined)

const selectedItem$ = computed(async (get) => {
  const id = get(selectedId$)
  if (!id) {
    return null // 前置条件不满足，提前返回
  }
  try {
    return await fetchItem(id)
  } catch (error) {
    throwIfAbort(error)
    return null
  }
})
```

### 3.7 Command Chaining Pattern（命令链式调用）

command 内部可以通过 `set` 调用其他 command：

```typescript
const validateForm$ = command(async ({ set }, signal: AbortSignal) => {
  const nameValid = await set(validateName$, signal)
  const emailValid = await set(validateEmail$, signal)
  return nameValid && emailValid
})

const submitForm$ = command(async ({ get, set }, signal: AbortSignal) => {
  const isValid = await set(validateForm$, signal)
  if (!isValid) return

  const data = get(formData$)
  await set(postData$, data, signal)
  set(resetForm$)
})
```

---

## 4. React 集成

### 4.1 StoreProvider 设置

应用入口处创建 Store 并通过 `StoreProvider` 注入：

```typescript
import { createStore } from 'ccstate'
import { StoreProvider } from 'ccstate-react'

const store = createStore()

function App() {
    return (
        <StrictMode>
            <StoreProvider value={store}>
                <Router />
            </StoreProvider>
        </StrictMode>
    )
}
```

MoXT 的实际入口模式：

```typescript
// main.ts
import { createStore } from 'ccstate'

async function main(rootEl: HTMLDivElement, store: Store, signal: AbortSignal) {
  await store.set(
    bootstrap$,
    () => {
      setupRouter(store, (el) => {
        const root = createRoot(rootEl)
        root.render(el)
        signal.addEventListener('abort', () => root.unmount())
      })
    },
    signal,
  )
}

detach(main(document.getElementById('root')!, createStore(), AbortSignal.any([])), Reason.Entrance)
```

### 4.2 基础 Hooks

| Hook                          | 用途                                                  | 示例                                         |
| ----------------------------- | ----------------------------------------------------- | -------------------------------------------- |
| `useGet(atom$)`               | 读取 state/computed 的当前值                          | `const count = useGet(count$)`               |
| `useSet(command$)`            | 获取 command 的调用函数                               | `const increment = useSet(increment$)`       |
| `useLastResolved(asyncAtom$)` | 获取异步 computed 最后一次成功的值，避免 loading 闪烁 | `const data = useLastResolved(data$)`        |
| `useLoadable(asyncAtom$)`     | 获取异步 computed 的完整加载状态                      | `const { state, data } = useLoadable(data$)` |

### 4.3 useGet + useSet 组合使用

```typescript
import { useGet, useSet } from 'ccstate-react'

function Counter() {
    const count = useGet(count$)
    const increment = useSet(increment$)

    return <button onClick={increment}>{count}</button>
}
```

### 4.4 useLastResolved（避免加载闪烁）

适用于数据可能被重新请求，但希望在新数据到来前保持旧数据展示的场景：

```typescript
function UserAvatar() {
    const userInfo = useLastResolved(userInfo$)

    if (!userInfo) return null

    return <Avatar>{userInfo.nickname.at(0)}</Avatar>
}
```

### 4.5 useLoadable（三态处理）

返回 `{ state: 'loading' | 'hasData' | 'hasError', data?, error? }`：

```typescript
function DataList() {
    const loadable = useLoadable(items$)

    if (loadable.state === 'loading') return <Spinner />
    if (loadable.state === 'hasError') return <Error error={loadable.error} />

    return <List items={loadable.data} />
}
```

### 4.6 事件处理中的异步 Command 调用

在 React 事件处理器中调用异步 command 时，使用 `detach` 处理 floating promise：

```typescript
function SearchInput() {
    const pageSignal = useGet(pageSignal$)
    const handleSearch = useSet(search$)

    return (
        <input onChange={(e) => {
            detach(handleSearch(e.target.value, pageSignal), Reason.DomCallback)
        }} />
    )
}
```

### 4.7 No Store in Params（禁止传递 Store）

**ESLint 规则 `no-store-in-params` 强制**：不要将 Store 作为函数参数传递。

```typescript
// ❌ 错误
function processData(store: Store) {
  store.get(someState$)
}

// ✅ 正确：在组件中用 hooks
function MyComponent() {
  const value = useGet(someState$)
}

// ✅ 正确：在 command 中用 context
const process$ = command(({ get, set }) => {
  const value = get(someState$)
})
```

---

## 5. AbortSignal 生命周期管理

MoXT 项目大量使用 `AbortSignal` 进行生命周期管理，这是最核心的实践之一。

### 5.1 Command 接收 AbortSignal 参数

command 通过参数接收 `AbortSignal`，用于取消异步操作和清理资源：

```typescript
const fetchData$ = command(async ({ get, set }, query: string, signal: AbortSignal) => {
  set(loading$, true)
  try {
    const result = await fetch(`/api/data?q=${query}`, { signal })
    signal.throwIfAborted()
    set(data$, await result.json())
  } catch (error) {
    throwIfAbort(error)
    set(error$, String(error))
  } finally {
    set(loading$, false)
  }
})
```

### 5.2 AbortSignal 清理模式

使用 `signal.addEventListener('abort', cleanup)` 在 signal abort 时执行清理：

```typescript
const addEditor$ = command(({ set }, id: symbol, editor: Editor, signal: AbortSignal) => {
  set(editors$, (prev) => ({ ...prev, [id]: editor }))

  // signal abort 时自动清理
  signal.addEventListener('abort', () => {
    set(editors$, (prev) => {
      const next = { ...prev }
      delete next[id]
      return next
    })
  })
})
```

### 5.3 不要通过 `get()` 获取 AbortSignal

**ESLint 规则 `no-get-signal` 警告**：AbortSignal 应该通过参数传递，不要从 state 中 `get`。

```typescript
// ❌ 错误：从 state 中 get AbortSignal
const signal$ = state<AbortSignal>(...)
const doSomething$ = command(({ get }) => {
    const signal = get(signal$) // 不推荐
})

// ✅ 正确：通过参数传递
const doSomething$ = command(({ get }, signal: AbortSignal) => {
    // 通过参数获取 signal
})
```

### 5.4 Abort Reason 规范

**ESLint 规则 `abort-signal-reason` 强制**：`abort()` 只允许无参数或传入 `new DOMException('reason', 'AbortError')`：

```typescript
// ✅ 正确
controller.abort()
controller.abort(new DOMException('User cancelled', 'AbortError'))

// ❌ 错误
controller.abort('reason')
controller.abort(new Error('Aborted'))
controller.abort(someVariable) // 禁止变量传递
```

### 5.5 isAbortError / throwIfAbort / throwIfNotAbort

三个核心工具函数用于处理 abort 错误：

```typescript
// 判断是否为 abort 错误
function isAbortError(error: unknown): boolean {
  if (error instanceof DOMException && error.name === 'AbortError') return true
  if (error instanceof Error && error.name === 'AbortError') {
    if (error.message === '' || error.message.startsWith('AbortError:')) return true
  }
  if (error instanceof Event && error.type === 'abort' && error.target instanceof AbortSignal)
    return true
  return false
}

// 如果是 abort 错误则重新抛出（让上层处理取消逻辑）
function throwIfAbort(error: unknown) {
  if (isAbortError(error)) throw error
}

// 如果不是 abort 错误则重新抛出（静默处理取消，但不吞掉真实错误）
function throwIfNotAbort(error: unknown) {
  if (!isAbortError(error)) throw error
}
```

### 5.6 Catch 块必须首先处理 Abort

**ESLint 规则 `no-catch-abort` 强制**：async 函数的 catch 块中必须首先调用 `throwIfAbort()`：

```typescript
// ✅ 正确
try {
  await fetchData(signal)
} catch (error) {
  throwIfAbort(error) // 必须是第一条语句
  handleError(error)
}

// ❌ 错误
try {
  await fetchData(signal)
} catch (error) {
  handleError(error) // throwIfAbort 不在第一行
  throwIfAbort(error)
}
```

### 5.7 Await 后检查 Signal

**ESLint 规则 `signal-check-await` 强制**：每个 `await` 之后必须检查 signal 是否已 abort（除非 await 的函数本身接受了 signal 参数）：

```typescript
// ✅ 正确：await 的函数接收了 signal，无需额外检查
const result = await fetch(url, { signal })

// ✅ 正确：手动检查
const result = await someAsyncOp()
signal.throwIfAborted()

// ❌ 错误：await 后未检查 signal
const result = await someAsyncOp()
doSomethingWith(result) // signal 可能已经 abort 了
```

---

## 6. 工具函数

### 6.1 `resetSignal()`

创建一个可重置的 AbortSignal 管理器。每次调用时，自动 abort 上一个 signal 并创建新的：

```typescript
import { command, state } from 'ccstate'

function resetSignal(): Command<AbortSignal, AbortSignal[]> {
  const controller$ = state<AbortController | undefined>(undefined)

  return command(({ get, set }, ...signals: AbortSignal[]) => {
    get(controller$)?.abort(new DOMException('reset signal', 'AbortError'))
    const controller = new AbortController()
    set(controller$, controller)
    return AbortSignal.any([controller.signal, ...signals])
  })
}
```

**用途**：Debounce、Tab 切换、页面导航等需要"取消上一次操作"的场景。

```typescript
const fetchSignal$ = resetSignal()

const search$ = command(async ({ set }, keyword: string, pageSignal: AbortSignal) => {
  const signal = set(fetchSignal$, pageSignal) // 取消上一次搜索
  const result = await fetch(`/api/search?q=${keyword}`, { signal })
  signal.throwIfAborted()
  set(results$, await result.json())
})
```

### 6.2 `switchSignal()`

在 `resetSignal` 基础上，额外暴露一个可读的当前 signal computed：

```typescript
function switchSignal(): {
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
    signal$: computed((get) => get(internalSignal$)),
  }
}
```

### 6.3 `createInputContext()`

创建表单输入的完整状态管理上下文，包含值、验证、错误信息、dirty 状态：

```typescript
const nameInput = createInputContext('', {
  validators: [
    {
      trigger: 'onBlur',
      validator$: command(async ({ get }, value: string, signal: AbortSignal) => {
        if (!value.trim()) return 'Name is required'
        return true
      }),
    },
  ],
})

// 返回的接口
nameInput.value$ // Computed<string> - 当前值
nameInput.setValue$ // Command - 设置值
nameInput.errorMessage$ // Computed<ReactNode | undefined> - 错误信息
nameInput.dirty$ // Computed<boolean> - 是否被修改过
nameInput.validate$ // Command - 触发验证
nameInput.reset$ // Command - 重置到初始值
nameInput.onChange$ // Command - 绑定 input onChange
nameInput.onBlur$ // Command - 绑定 input onBlur
nameInput.onRef$ // Command - 绑定 input ref
```

### 6.4 `createDelayBooleanSwitch()`

开关状态管理，支持可选延迟（常用于弹窗、菜单、tooltip 等需要延迟关闭的 UI）：

```typescript
const dialogCtrl = createDelayBooleanSwitch()

// 读取状态
const isOpen = useGet(dialogCtrl.booleanState$)

// 立即更新
useSet(dialogCtrl.updateBooleanState$)(true)

// 延迟 300ms 关闭
useSet(dialogCtrl.updateBooleanState$)(false, 300)
```

### 6.5 `createDeferredPromise()`

创建可外部 resolve/reject 的 Promise，绑定到 AbortSignal 生命周期：

```typescript
function createDeferredPromise<T>(signal: AbortSignal): {
  promise: Promise<T>
  resolve: (value: T) => void
  reject: (reason?: unknown) => void
  settled: () => boolean
}
```

### 6.6 `parallel()`

带 signal 检查的 `Promise.all` 包装：

```typescript
const [users, posts] = await parallel(signal, fetchUsers(signal), fetchPosts(signal))
```

### 6.7 `promiseWithRetry$`

带重试机制的 command 执行：

```typescript
const success = await set(promiseWithRetry$, fetchData$, 3, signal) // 最多重试 3 次
```

### 6.8 `createLocalStorageManager()`

将 localStorage 桥接到 ccstate 响应式系统：

```typescript
const themeManager = createLocalStorageManager('theme')

// 读取（响应式）
const theme = useGet(themeManager.get$)

// 写入（自动触发重新计算）
useSet(themeManager.set$)('dark')

// 清除
useSet(themeManager.clear$)()
```

### 6.9 `onRef()`

将 React ref 回调桥接到 ccstate command，并自动管理 AbortSignal 生命周期：

```typescript
function onRef<T extends HTMLElement>(command$: Command<void | Promise<void>, [T, AbortSignal]>) {
  return command(({ set }, el: T | null) => {
    if (!el) return
    const ctrl = new AbortController()
    detach(set(command$, el, ctrl.signal), Reason.DomCallback)
    return () => {
      ctrl.abort()
    } // React 卸载时自动 abort
  })
}
```

### 6.10 `createPolling()`

响应式轮询，自动处理页面可见性：

```typescript
const polling = createPolling(fetchUpdates$, {
  intervalMs: 5000,
  immediate: true,
  visible$: pageVisible$, // 页面不可见时自动暂停
})

// 启动轮询
set(polling.start$, signal)
```

---

## 7. Floating Promise 处理

### 7.1 `detach()` 函数

显式标记不需要 await 的 Promise，静默处理 abort 错误，分类标注原因：

```typescript
function detach<T>(promise: T | Promise<T>, reason: Reason, description?: string): void
```

### 7.2 Reason 枚举

```typescript
enum Reason {
    Daemon       // 永不 resolve 的后台任务（如长连接）
    DomCallback  // DOM 事件回调（onClick、onScroll、onRef 等）
    JsCall       // 框架自动处理的异步调用
    Entrance     // 应用入口 main 函数
    Deferred     // 延迟执行的任务
    CrashReport  // 崩溃上报
    DatadogLog   // 数据埋点上报
    Toast        // Toast 通知
}
```

### 7.3 使用场景

```typescript
// DOM 事件回调
<button onClick={() => {
    detach(handleClick(signal), Reason.DomCallback)
}}>

// 应用入口
detach(main(), Reason.Entrance)

// 后台数据上报
detach(sendMetric(data), Reason.DatadogLog)

// 延迟任务
detach(set(deferredTask$), Reason.Deferred)
```

---

## 8. 异步模式

### 8.1 Async Computed（异步计算）

```typescript
const users$ = computed(async (get) => {
  get(reloadTrigger$) // 订阅重载触发器
  try {
    return await fetch('/api/users').then((r) => r.json())
  } catch (error) {
    throwIfAbort(error)
    return null
  }
})
```

### 8.2 三态异步 Command（loading / error / data）

```typescript
const internalLoading$ = state(false)
const internalError$ = state<string | null>(null)

const submitForm$ = command(async ({ get, set }, signal: AbortSignal) => {
  set(internalLoading$, true)
  set(internalError$, null)
  try {
    await postData(get(formData$), signal)
    signal.throwIfAborted()
    set(resetForm$)
  } catch (error) {
    throwIfAbort(error)
    set(internalError$, String(error))
  } finally {
    set(internalLoading$, false)
  }
})
```

### 8.3 Debounce 模式

使用 `resetSignal()` + `timeout()` 实现 debounce：

```typescript
const debounceSignal$ = resetSignal()

const search$ = command(({ get, set }, keyword: string) => {
  set(rawKeyword$, keyword)

  const signal = set(debounceSignal$) // 取消上一次的 timeout
  timeout(
    () => {
      detach(set(fetchResults$, keyword, signal), Reason.Deferred)
    },
    300,
    { signal },
  )
})
```

### 8.4 批量发送模式

收集数据到队列，按条数或时间间隔批量发送：

```typescript
const BATCH_SIZE = 100
const FLUSH_INTERVAL = 5000

const queue$ = state<MetricData[]>([])
const flushTimerSignal$ = resetSignal()

const addToQueue$ = command(({ get, set }, data: MetricData) => {
  const queue = [...get(queue$), data]
  set(queue$, queue)

  if (queue.length >= BATCH_SIZE) {
    set(flush$) // 到达上限，立即发送
  } else if (queue.length === 1) {
    set(scheduleFlush$) // 第一条数据，启动定时器
  }
})

const scheduleFlush$ = command(({ set }) => {
  const signal = set(flushTimerSignal$)
  timeout(
    () => {
      set(flush$)
    },
    FLUSH_INTERVAL,
    { signal },
  )
})

const flush$ = command(({ get, set }) => {
  const data = get(queue$)
  if (!data.length) return
  set(queue$, [])
  set(flushTimerSignal$) // 取消定时器
  detach(sendBatch(data), Reason.DatadogLog)
})
```

### 8.5 HTTP 客户端层级 Computed

通过 computed 层级组合构建 HTTP 客户端：

```typescript
// 基础层：原始 fetch
const internalMoxtFetch$ = computed((get) => {
  const token = get(authToken$)
  return async (url: string, options?: RequestInit) => {
    return fetch(url, {
      ...options,
      headers: { ...options?.headers, Authorization: `Bearer ${token}` },
    })
  }
})

// 中间层：添加重试逻辑
const moxtFetch$ = computed((get) => {
  const baseFetch = get(internalMoxtFetch$)
  return async (url: string, options?: FetchOptions) => {
    if (!options?.retry) return baseFetch(url, options)
    // ... 重试逻辑
  }
})

// 上层：JSON 解析
const moxtFetchJson$ = computed((get) => {
  const moxtFetch = get(moxtFetch$)
  return async <T>(url: string, options?: FetchOptions): Promise<T> => {
    const response = await moxtFetch(url, options)
    return response.json() as Promise<T>
  }
})
```

---

## 9. ESLint 规则

MoXT 使用自定义 ESLint 插件 (`moxt-eslint`) 来强制执行 ccstate 最佳实践。

### 9.1 ccstate 相关规则一览

| 规则                          | 级别  | 说明                                                               |
| ----------------------------- | ----- | ------------------------------------------------------------------ |
| `signal-dollar-suffix`        | error | 所有 ccstate 信号变量必须以 `$` 结尾                               |
| `no-export-state`             | error | 禁止直接导出 `State` 类型                                          |
| `no-store-in-params`          | error | 禁止函数参数接收 `Store` 类型                                      |
| `no-get-signal`               | warn  | 禁止通过 `get()` 获取 `AbortSignal` 类型的 state/computed          |
| `no-global-state-in-document` | error | 禁止在特定目录中声明全局 state                                     |
| `signal-check-await`          | error | await 之后必须检查 signal 是否已 abort                             |
| `no-catch-abort`              | error | async 函数的 catch 块必须首先调用 `throwIfAbort()`                 |
| `abort-signal-reason`         | error | `abort()` 参数必须是无参或 `new DOMException('...', 'AbortError')` |

### 9.2 规则背后的设计哲学

1. **State 封装**：`no-export-state` 确保状态变更只能通过受控的 command 进行
2. **AbortSignal 安全**：`signal-check-await`、`no-catch-abort`、`abort-signal-reason` 三条规则共同保证异步操作的取消安全性
3. **架构约束**：`no-store-in-params`、`no-global-state-in-document` 防止 Store 被不当使用
4. **命名一致**：`signal-dollar-suffix` 让代码中的 signal 一目了然

---

## 10. 测试模式

### 10.1 测试 Store 创建

每个测试创建独立的 Store 实例：

```typescript
import { createStore } from 'ccstate'
import { StoreProvider } from 'ccstate-react'

const createTestStore = () => {
  const store = createStore()
  // 初始化必要状态
  store.set(setPageSignal$, new AbortController().signal)
  return store
}
```

### 10.2 测试上下文工厂

统一管理测试生命周期：

```typescript
function testContext() {
  let controller = new AbortController()
  let store: Store | null = null

  const context = {
    get signal() {
      return controller.signal
    },
    get store() {
      if (!store) {
        store = createStore()
        this.signal.addEventListener('abort', () => {
          store = null
        })
      }
      return store
    },
  } as const

  afterEach(async () => {
    // 清理状态
    controller.abort(new DOMException('Test cleanup', 'AbortError'))
    controller = new AbortController()
  })

  return Object.freeze(context)
}
```

### 10.3 组件测试

```typescript
describe('[owner@example.com] component tests', () => {
    it('GIVEN initial state WHEN render THEN shows default value', async () => {
        const store = createTestStore()
        const context = createInputContext('')

        render(
            <StrictMode>
                <StoreProvider value={store}>
                    <Input context={context} />
                </StoreProvider>
            </StrictMode>,
        )

        const input = screen.getByTestId('input-wrapper')
        expect(input).toBeInTheDocument()
    })
})
```

---

## 11. 项目结构

### 11.1 目录组织（按功能域）

```
src/
├── signals/            # 所有 ccstate 信号（按功能域组织）
│   ├── auth/           # 认证相关
│   ├── editor-v2/      # 编辑器相关
│   │   ├── chat/       # 聊天功能
│   │   ├── window/     # 窗口管理
│   │   └── ...
│   ├── external/       # 外部服务集成
│   │   ├── http-client.ts
│   │   ├── workspace.ts
│   │   └── local-storage/
│   ├── lifecycle/      # 生命周期管理
│   ├── plan/           # 计划/订阅
│   └── utils.ts        # 通用工具（isAbortError 等）
├── utils/
│   └── ccstate-helper/ # ccstate 工具函数
│       ├── action.ts   # resetSignal, switchSignal
│       └── input-context.ts
├── views/              # React 组件
└── main.ts             # 入口
```

### 11.2 关键原则

- Signal 文件按**功能域**组织，不按类型（state/computed/command）分
- 每个文件导出公共 API（computed/command），内部 state 使用 `internal` 前缀且不导出
- 工具函数放在 `utils/ccstate-helper/` 中

---

## 12. Babel 集成

开发环境使用 `ccstate-babel/preset` 增强调试体验：

```typescript
// vite.config.ts
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [
    react({
      babel: {
        presets:
          process.env.NODE_ENV === 'production'
            ? []
            : [['ccstate-babel/preset', { projectRoot: __dirname }]],
      },
    }),
  ],
})
```

**作用**：在开发模式下自动为 ccstate 信号添加调试信息（如文件位置、变量名），方便在 devtools 中定位问题。生产环境不启用以避免额外开销。

---

## Pattern 速查表

| Pattern              | 场景                  | 关键技术                              |
| -------------------- | --------------------- | ------------------------------------- |
| Encapsulation        | 封装内部状态          | `internal` 前缀 + `no-export-state`   |
| Factory              | 创建可复用状态模块    | 工厂函数返回 `as const`               |
| Store Module         | 组织复杂业务状态      | factory 组合 + spread 导出            |
| Reload Trigger       | 缓存失效/重新加载     | `state(0)` + increment                |
| Updater Function     | 基于前值更新          | `set(atom$, prev => ...)`             |
| Conditional Computed | 条件异步计算          | 前置条件 + 提前返回 null              |
| Command Chaining     | 组合多个操作          | command 内 `set` 其他 command         |
| resetSignal          | 取消上一次操作        | AbortController 重置                  |
| Debounce             | 防抖                  | resetSignal + timeout                 |
| Batch                | 批量发送              | 队列 + 双触发（数量/时间）            |
| Layered Computed     | HTTP 客户端           | computed 层级组合                     |
| Three-state Async    | 异步加载状态          | loading$ + error$ + try-catch-finally |
| Detach               | 处理 floating promise | detach(promise, Reason)               |
| onRef                | DOM ref 生命周期      | AbortController + cleanup             |
| Test Context         | 测试隔离              | 独立 Store + afterEach abort          |
