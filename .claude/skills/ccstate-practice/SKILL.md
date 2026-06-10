---
name: ccstate-practice
description: Patterns and best practices for using ccstate state management in this practice project
---

# ccstate Patterns and Best Practices

This document records common patterns and best practices when using ccstate in this project.

## Core Primitives

ccstate provides three core primitives:

| Primitive                                 | Purpose                              | React analogy |
| ----------------------------------------- | ------------------------------------ | ------------- |
| `state(initialValue)`                     | Readable/writable state unit         | `useState`    |
| `computed((get) => ...)`                  | Derived state with auto-tracked deps | `useMemo`     |
| `command(({ get, set }, ...args) => ...)` | Side-effect operations               | Event handler |

```typescript
import { state, computed, command } from 'ccstate'

const count$ = state(0)
const doubled$ = computed((get) => get(count$) * 2)
const increment$ = command(({ get, set }) => {
  set(count$, get(count$) + 1)
})
```

## Signal Factory Pattern (Enforced)

**ESLint rule `ccstate/no-module-level-signal` enforces this**: All signals must be created inside a factory function, never at module level. This ensures signals exist within a specific scope and can be properly managed.

### Problem

Module-level signals are global singletons — they share state across all usages and cannot be scoped or garbage collected.

### Solution

Wrap signal creation in a factory function that returns the public interface.

### Pattern

```typescript
// ❌ Forbidden: module-level signal declarations
const count$ = state(0)
const doubled$ = computed((get) => get(count$) * 2)
export const increment$ = command(({ set }) => { ... })

// ✅ Required: factory function
export function createCounter(initialValue = 0) {
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

export type CounterContext = ReturnType<typeof createCounter>
```

### Key Points

1. **Factory returns `as const`** — preserves readonly types
2. **Export the type** via `ReturnType<typeof factory>` for consumers
3. **Internal state stays private** — use `internal` prefix, never expose in the return value
4. **Sub-factories for composition** — break complex factories into smaller `createXxx` helpers

### Route Command Factory

Route commands also use the factory pattern:

```typescript
export function createHomePage() {
  const homeCommand$: RouteCommand = command(() => {
    return <div>Home Page</div>
  })
  return homeCommand$
}
```

## Encapsulation Pattern

State signals must never be exported. Expose read access via `computed` and write access via `command`.

**ESLint rule `ccstate/no-export-state` enforces this.**

```typescript
// ❌ Forbidden
export const users$ = state<User[]>([])

// ✅ Required
const internalUsers$ = state<User[]>([])
export const users$ = computed((get) => get(internalUsers$))
export const addUser$ = command(({ set }, user: User) => {
  set(internalUsers$, (prev) => [...prev, user])
})
```

## Naming Conventions

### `$` suffix (Enforced)

All signal variables must end with `$`. Enforced by ESLint rule `ccstate/signal-dollar-suffix`.

```typescript
const count$ = state(0)
const doubled$ = computed((get) => get(count$) * 2)
const increment$ = command(({ set }) => { ... })
```

### `internal` prefix

Private state uses `internal` prefix and is never exported:

```typescript
const internalCount$ = state(0)
const count$ = computed((get) => get(internalCount$))
```

### Factory function naming

Factory functions use `create` prefix and return a context object:

```typescript
export function createColumnsPageContext() { ... }
export type ColumnsPageContext = ReturnType<typeof createColumnsPageContext>
```

## Common Patterns

### Updater Function Pattern

`set` accepts an updater function to compute new value from previous:

```typescript
const items$ = state<Item[]>([])

const addItem$ = command(({ set }, item: Item) => {
  set(items$, (prev) => [...prev, item])
})

const removeItem$ = command(({ set }, id: string) => {
  set(items$, (prev) => prev.filter((item) => item.id !== id))
})
```

### Storing Function Values — The Updater Gotcha

When `set(atom$, value)` receives a function as `value`, ccstate treats it as an updater — it calls `value(previousValue)` and stores the return value. This means you cannot directly store a function in state.

```typescript
const cleanup$ = state<(() => void) | null>(null)

// ❌ BUG: ccstate calls the arrow function as an updater
set(cleanup$, () => {
  reader.cancel()
})

// ✅ Wrap in an updater that returns the function
const cleanupFn = () => {
  reader.cancel()
}
set(cleanup$, () => cleanupFn)
```

### Reload Trigger Pattern

Use a simple `state(0)` as a cache invalidation trigger:

```typescript
const internalReloadTrigger$ = state(0)

const data$ = computed(async (get) => {
  get(internalReloadTrigger$) // subscribe to trigger, value itself doesn't matter
  return await fetchData()
})

const reload$ = command(({ set }) => {
  set(internalReloadTrigger$, (prev) => prev + 1)
})
```

### Conditional Computed Pattern

Early return in computed when preconditions are not met:

```typescript
const selectedId$ = state<string | undefined>(undefined)

const selectedItem$ = computed(async (get) => {
  const id = get(selectedId$)
  if (!id) return null
  try {
    return await fetchItem(id)
  } catch (error) {
    throwIfAbort(error)
    return null
  }
})
```

### Command Chaining Pattern

Commands can call other commands via `set`:

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

### Debounce Pattern

Using `resetSignal()` + `timeout()`:

```typescript
function createSearchContext() {
  const debounceSignal$ = resetSignal()
  const internalResults$ = state([])

  return {
    results$: computed((get) => get(internalResults$)),
    search$: command(({ set }, keyword: string) => {
      const signal = set(debounceSignal$) // cancels previous timeout
      timeout(
        () => {
          detach(set(fetchResults$, keyword, signal), Reason.Deferred)
        },
        300,
        { signal },
      )
    }),
  }
}
```

## AbortSignal Lifecycle

### Signal hierarchy

```
rootSignal (app lifecycle, never aborts)
  └── routeSignal (per-route, aborted on navigation)
      └── resetSignal (per-operation, aborted on next call)
```

### Command receives AbortSignal as parameter

```typescript
const fetchData$ = command(async ({ set }, query: string, signal: AbortSignal) => {
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

### Do NOT get AbortSignal from state

**ESLint rule `ccstate/no-get-signal` warns against this.** Pass signals as parameters instead.

```typescript
// ❌ Bad
const signal$ = state<AbortSignal>(...)
const doSomething$ = command(({ get }) => {
  const signal = get(signal$)
})

// ✅ Good
const doSomething$ = command(({ get }, signal: AbortSignal) => { ... })
```

### Abort reason must be DOMException

**ESLint rule `ccstate/abort-signal-reason` enforces this.**

```typescript
// ✅ Correct
controller.abort()
controller.abort(new DOMException('reset signal', 'AbortError'))

// ❌ Forbidden
controller.abort('reason')
controller.abort(new Error('aborted'))
controller.abort(someVariable)
```

### Catch blocks must handle abort first

**ESLint rule `ccstate/no-catch-abort` enforces this.**

```typescript
try {
  await fetchData(signal)
} catch (error) {
  throwIfAbort(error) // must be first statement
  handleError(error)
}
```

### Check signal after every await

**ESLint rule `ccstate/signal-check-await` enforces this** (disabled in test files).

```typescript
// If the awaited function does NOT receive signal, check manually:
const result = await someAsyncOp()
signal.throwIfAborted()

// If the awaited function receives signal, no check needed:
const result = await fetch(url, { signal })
```

### AbortSignal cleanup pattern

Use `signal.addEventListener('abort', cleanup)` to perform cleanup when signal aborts:

```typescript
const addEditor$ = command(({ set }, id: symbol, editor: Editor, signal: AbortSignal) => {
  set(editors$, (prev) => ({ ...prev, [id]: editor }))

  signal.addEventListener('abort', () => {
    set(editors$, (prev) => {
      const next = { ...prev }
      delete next[id]
      return next
    })
  })
})
```

### isAbortError / throwIfAbort / throwIfNotAbort

Three core utilities for abort error handling:

```typescript
import { isAbortError, throwIfAbort, throwIfNotAbort } from './common/abort.ts'

// isAbortError(error) — checks DOMException with name "AbortError"
// throwIfAbort(error) — re-throw if abort (let caller handle cancellation)
// throwIfNotAbort(error) — re-throw if NOT abort (silence cancellation, propagate real errors)
```

## Utility Functions

### `resetSignal()`

Creates a resettable AbortSignal manager. Each call aborts the previous signal and creates a new one.

```typescript
import { resetSignal } from './common/action.ts'

function createSearchContext() {
  const fetchSignal$ = resetSignal()

  return {
    search$: command(async ({ set }, keyword: string, pageSignal: AbortSignal) => {
      const signal = set(fetchSignal$, pageSignal) // cancels previous
      const result = await fetch(`/api/search?q=${keyword}`, { signal })
      signal.throwIfAborted()
      set(results$, await result.json())
    }),
  }
}
```

### `switchSignal()`

Like `resetSignal()` but also exposes a readable `signal$` computed:

```typescript
import { switchSignal } from './common/action.ts'

const { switch$, signal$ } = switchSignal()
// set(switch$, parentSignal) — abort previous, create new
// get(signal$) — read current signal
```

### `onRef()`

Bridges React ref callbacks to ccstate commands with automatic AbortSignal lifecycle:

```typescript
import { onRef } from './common/ref.ts'

const setEl$ = onRef(
  command(({ set }, el: HTMLElement, signal: AbortSignal) => {
    signal.addEventListener('abort', () => set(internalEl$, null))
    set(internalEl$, el)
  }),
)

// In component — pass directly as ref, do NOT wrap in arrow function:
const setEl = useSet(setEl$)
return <div ref={setEl} />
```

### `detach()`

Explicitly marks fire-and-forget promises. Tracks them for test cleanup via `clearAllDetached()`.

```typescript
import { detach, Reason } from './common/detach.ts'

// Reason enum:
// Reason.DOM      — DOM event callbacks
// Reason.Root     — app root
// Reason.Deferred — delayed tasks
// Reason.Daemon   — background tasks that never resolve

// DOM event callbacks
const handleClick = () => {
  detach(commandFn(signal), Reason.DOM)
}

// App root
detach(main(), Reason.Root)
```

### `keyedState()`

Key-scoped state that auto-resets when context changes:

```typescript
import { keyedState } from './common/keyed-state.ts'

const { value$, set$ } = keyedState(contextId$, initialValue)
// value$ returns initial when key mismatches
// set$ silently discards writes when key is undefined
```

### `keyedSession()`

Key-scoped session with open/update/close semantics:

```typescript
import { keyedSession } from './common/keyed-state.ts'

const { session$, open$, update$, close$ } = keyedSession<MySession>(contextId$)
```

### `createDeferredPromise()`

Creates an externally resolvable Promise bound to AbortSignal lifecycle:

```typescript
import { createDeferredPromise } from './common/promise.ts'

const { promise, resolve, reject, settled } = createDeferredPromise<T>(signal)
// Auto-rejects with signal.reason when signal aborts
```

### `parallel()`

`Promise.all` wrapper with signal check:

```typescript
import { parallel } from './common/promise.ts'

const [users, posts] = await parallel(signal, fetchUsers(signal), fetchPosts(signal))
```

## React Integration

### Basic hooks

| Hook                      | Purpose                                                 |
| ------------------------- | ------------------------------------------------------- |
| `useGet(signal$)`         | Read state/computed value                               |
| `useSet(command$)`        | Get command's invocation function                       |
| `useLastResolved(async$)` | Last successful value (avoids loading flicker)          |
| `useLoadable(async$)`     | Full loading state (`loading` / `hasData` / `hasError`) |

### StoreProvider setup

```typescript
import { createStore } from 'ccstate'
import { StoreProvider } from 'ccstate-react'

const store = createStore()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <StoreProvider value={store}>
      <App />
    </StoreProvider>
  </StrictMode>,
)
```

### Passing context as props

Factory results are plain objects — pass them as React props:

```typescript
// Parent creates context
const ctx = createColumnsPageContext()
return <ColumnsPage ctx={ctx} />

// Child consumes via props
function ColumnsPage({ ctx }: { ctx: ColumnsPageContext }) {
  const cols = useGet(ctx.columns$)
  const addCol = useSet(ctx.addColumn$)
  // ...
}
```

### useLastResolved (avoids loading flicker)

Keeps showing old data while new data is loading:

```typescript
function UserList() {
  const users = useLastResolved(users$)
  if (!users) return null
  return <List items={users} />
}
```

### useLoadable (three-state handling)

Returns `{ state: 'loading' | 'hasData' | 'hasError', data?, error? }`:

```typescript
function DataList() {
  const loadable = useLoadable(items$)

  if (loadable.state === 'loading') return <Spinner />
  if (loadable.state === 'hasError') return <Error error={loadable.error} />

  return <List items={loadable.data} />
}
```

### Async commands in event handlers

Use `detach` for fire-and-forget async calls in DOM callbacks:

```typescript
function SearchInput() {
  const handleSearch = useSet(search$)

  return (
    <input onChange={(e) => {
      detach(handleSearch(e.target.value, signal), Reason.DOM)
    }} />
  )
}
```

## No Store in Params

**ESLint rule `ccstate/no-store-in-params` enforces this.** Never pass `Store` as a function parameter.

```typescript
// ❌ Forbidden
function processData(store: Store) {
  store.get(someState$)
}

// ✅ In components, use hooks
function MyComponent() {
  const value = useGet(someState$)
}

// ✅ In logic, use commands
const process$ = command(({ get, set }) => {
  const value = get(someState$)
})
```

## Testing Patterns

### Independent store per test

Each test creates its own Store instance for isolation:

```typescript
import { createStore } from 'ccstate'
import { StoreProvider } from 'ccstate-react'

function createTestStore() {
  const store = createStore()
  return store
}
```

### Test context factory

Unified test lifecycle management:

```typescript
function testContext() {
  let controller = new AbortController()

  const context = {
    get signal() {
      return controller.signal
    },
    get store() {
      return createStore()
    },
  } as const

  afterEach(async () => {
    controller.abort(new DOMException('Test cleanup', 'AbortError'))
    controller = new AbortController()
  })

  return Object.freeze(context)
}
```

### Test cleanup order

```typescript
afterEach(async () => {
  await clearAllDetached() // 1. abort & await all detached promises
  // 2. then reset other state (e.g., mock handlers)
})
```

### GWT test structure

Tests follow Given-When-Then pattern:

```typescript
describe('[owner@example.com] component tests', () => {
  it('GIVEN initial state WHEN render THEN shows default value', async () => {
    const store = createTestStore()
    const ctx = createCounter(0)

    render(
      <StrictMode>
        <StoreProvider value={store}>
          <Counter ctx={ctx} />
        </StoreProvider>
      </StrictMode>,
    )

    expect(screen.getByTestId('count')).toHaveTextContent('0')
  })
})
```

## Project Structure

```
src/
├── common/              # Shared utilities and signal helpers
│   ├── abort.ts         # isAbortError, throwIfAbort, throwIfNotAbort
│   ├── action.ts        # resetSignal, switchSignal
│   ├── detach.ts        # detach, clearAllDetached, Reason
│   ├── ref.ts           # onRef
│   ├── keyed-state.ts   # keyedState, keyedSession
│   ├── promise.ts       # createDeferredPromise, parallel
│   ├── command-return.ts # CommandReturn type helper
│   ├── route-command.ts # RouteCommand type
│   └── route-scope.ts  # createRouteContext
├── components/          # React components + their signal factories
│   ├── route.tsx        # Root route component
│   ├── home.tsx         # createHomePage factory
│   ├── about.tsx        # createAboutPage factory
│   ├── columns.tsx      # createColumnsPage factory
│   ├── columns-page-context.ts  # createColumnsPageContext factory
│   └── columns-page.tsx # ColumnsPage view component
├── App.tsx
└── main.tsx             # App entry, store creation, router setup
```

### Key principles

- Signal factories live alongside their consuming components
- `common/` holds reusable ccstate utilities (not business logic)
- Each factory file exports: the factory function + the context type
- View components (`.tsx`) consume context via props using `useGet`/`useSet`

## ESLint Rules Summary

| Rule                     | Level | Description                               |
| ------------------------ | ----- | ----------------------------------------- |
| `signal-dollar-suffix`   | error | Signal variables must end with `$`        |
| `no-export-state`        | error | Never export State directly               |
| `no-module-level-signal` | error | No module-level signal declarations       |
| `no-store-in-params`     | error | No Store type in function parameters      |
| `no-get-signal`          | warn  | Don't get AbortSignal from state          |
| `signal-check-await`     | error | Check signal after await (off in tests)   |
| `no-catch-abort`         | error | Catch blocks must call throwIfAbort first |
| `abort-signal-reason`    | error | abort() only accepts DOMException         |
