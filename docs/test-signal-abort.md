# 异步测试清理机制说明

测试采用了基于 **AbortSignal** 的异步测试清理机制，确保测试间的隔离性和稳定性。

## 核心理念

**问题**：异步操作（setTimeout、fetch、事件监听等）可能在测试结束后仍在运行，导致：

- 测试间相互干扰
- 未处理的 Promise rejection
- 资源泄露和不稳定的测试结果

**解决方案**：使用 AbortSignal 统一管理所有异步操作的生命周期，在测试结束时优雅地终止所有异步任务。

## 核心组件

### 1. detach-promise 机制

#### `detach()` 函数

用于标记和管理"分离"的 Promise，这些是不需要显式等待的异步操作。

**Promise 分类**：

- `Daemon`: 后台长连接任务（如 WebSocket 连接）
- `DomCallback`: DOM 事件回调的异步操作（如 onClick, onScroll）
- `Entrance`: 应用入口函数
- `Deferred`: 延迟执行任务

**使用示例**：

```typescript
// 标记一个后台任务
detach(longRunningTask(), Reason.Daemon, 'WebSocket connection')

// 标记 DOM 事件回调
detach(handleClick(), Reason.DomCallback, 'Button click handler')
```

#### `clearAllDetached()` 函数

在测试结束后等待所有分离的 Promise 完成，确保：

- 防止测试间的异步操作干扰
- 捕获并处理未处理的 Promise rejection
- 提供详细的调试日志

### 2. createTestContext 机制

提供基于 AbortSignal 的测试上下文管理：

**核心功能**：

- **AbortSignal**: 提供统一的取消机制
- **自动清理**: 测试结束时发送中止信号
- **生命周期管理**: 确保所有异步操作正确终止

**使用示例**：

```typescript
it('should handle async operations', () => {
  const ctx = createTestContext()

  // 使用 abort signal 控制异步操作
  someAsyncOperation(ctx.signal)

  // 测试结束时自动清理
})
```

### 3. 测试清理链

三个 `afterEach` 钩子确保完整的测试清理：

```typescript
afterEach(() => {
  vi.restoreAllMocks() // 1. 恢复所有 mock 函数
})

afterEach(() => {
  return clearAllDetached() // 2. 等待并清理所有异步操作
})

// createTestContext 中的 afterEach
afterEach(() => {
  controller.abort(error) // 3. 中止测试上下文，发送 AbortSignal
})
```

**执行顺序的重要性**：

1. 先恢复 mocks，确保清理操作使用真实实现
2. 等待异步任务优雅完成
3. 最后发送中止信号，终止剩余操作

## 常见错误与正确写法

### ❌ 错误写法 1：异步操作不响应 AbortSignal

```typescript
// 错误：没有监听 abort 信号
it('should handle timeout', () => {
  const ctx = createTestContext()

  setTimeout(() => {
    // 测试结束后仍在执行，可能访问已清理的资源
    console.log('This runs after test ends') // 💥 可能导致测试间干扰
  }, 100)
})
```

### ✅ 正确写法 1：响应 AbortSignal

```typescript
// 正确：监听并响应中止信号
it('should handle timeout correctly', async () => {
  const ctx = createTestContext()

  const abortableTimeout = () => {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => resolve('done'), 100)

      ctx.signal.addEventListener('abort', () => {
        clearTimeout(timeoutId)
        reject(ctx.signal.reason)
      })
    })
  }

  try {
    await abortableTimeout()
  } catch (error) {
    if (error.name === 'AbortError') {
      return // 正常的测试结束
    }
    throw error
  }
})
```

### ❌ 错误写法 2：长时间 Promise 没有清理

```typescript
// 错误：Promise 不响应中止信号
it('should fetch data', () => {
  const ctx = createTestContext()

  const fetchData = () => {
    return new Promise(resolve => {
      // 没有监听 abort 事件，测试结束后仍在运行
      setTimeout(() => resolve('data'), 1000)
    })
  }

  fetchData() // 💥 可能导致测试挂起或下个测试失败
})
```

### ✅ 正确写法 2：可中止的 Promise

```typescript
// 正确：创建可中止的 Promise
it('should fetch data with abort support', async () => {
  const ctx = createTestContext()

  const fetchData = (signal: AbortSignal) => {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => resolve('data'), 1000)

      signal.addEventListener('abort', () => {
        clearTimeout(timeoutId)
        reject(signal.reason)
      })
    })
  }

  try {
    const result = await fetchData(ctx.signal)
    expect(result).toBe('data')
  } catch (error) {
    if (error.name === 'AbortError') {
      return // 测试被正常中止
    }
    throw error
  }
})
```

### ❌ 错误写法 3：事件监听器没有清理

```typescript
// 错误：添加事件监听器但不清理
it('should handle DOM events', () => {
  const ctx = createTestContext()
  const button = document.createElement('button')

  // 添加事件监听器但没有清理机制
  button.addEventListener('click', () => {
    console.log('Button clicked') // 💥 测试结束后可能仍被调用
  })
})
```

### ✅ 正确写法 3：自动清理的事件监听器

```typescript
// 正确：使用 AbortSignal 自动清理事件监听器
it('should handle DOM events with cleanup', () => {
  const ctx = createTestContext()
  const button = document.createElement('button')

  // 使用 AbortSignal 自动清理事件监听器
  button.addEventListener(
    'click',
    () => {
      console.log('Button clicked')
    },
    { signal: ctx.signal }
  )

  // 或手动清理
  const handleClick = () => console.log('Button clicked')
  button.addEventListener('click', handleClick)

  ctx.signal.addEventListener('abort', () => {
    button.removeEventListener('click', handleClick)
  })
})
```

### ❌ 错误写法 4：不正确的 detach 使用

```typescript
// 错误：没有使用 detach 标记异步操作
it('should handle background task', () => {
  const ctx = createTestContext()

  // 启动后台任务但没有用 detach 标记
  backgroundTask() // 💥 可能在测试间泄露
})
```

### ✅ 正确写法 4：正确使用 detach

```typescript
// 正确：使用 detach 标记和管理异步操作
it('should handle background task with detach', () => {
  const ctx = createTestContext()

  const task = async () => {
    // 响应中止信号的后台任务
    while (!ctx.signal.aborted) {
      await doSomeWork()
      await new Promise(resolve => setTimeout(resolve, 100))
    }
  }

  // 标记为分离的异步操作
  detach(task(), Reason.Daemon, 'Background processing task')
})
```

## 最佳实践

### 1. 始终使用 createTestContext

```typescript
it('test name', () => {
  const ctx = createTestContext() // 必须
  // 使用 ctx.signal 控制异步操作
})
```

### 2. 让异步操作响应 AbortSignal

```typescript
const abortableOperation = (signal: AbortSignal) => {
  return new Promise((resolve, reject) => {
    // 业务逻辑
    signal.addEventListener('abort', () => {
      // 清理资源并拒绝 Promise
      reject(signal.reason)
    })
  })
}
```

### 3. 使用 detach 管理不需要等待的异步操作

```typescript
detach(longRunningTask(), Reason.Daemon, 'Task description')
```

### 4. 正确处理 AbortError

```typescript
try {
  await abortableOperation(ctx.signal)
} catch (error) {
  if (error.name === 'AbortError') {
    return // 正常的测试结束
  }
  throw error // 重新抛出其他错误
}
```

## 调试技巧

### 1. 查看 detached promises 日志

测试运行时会输出详细的 promise 收集和清理日志：

```
Detach promise daemon Background task
Clear all detached promises
  Await promise: daemon Background task
```

### 2. 检查 AbortError

如果测试因 "Aborted due to finished test" 失败，检查：

- 异步操作是否监听了 `ctx.signal`
- 是否有未使用 `detach` 标记的后台任务
- 订阅是否正确清理

### 3. 使用 console.debug

在异步操作中添加调试日志：

```typescript
ctx.signal.addEventListener('abort', () => {
  console.debug('Operation aborted:', operation.name)
  cleanup()
})
```

这套机制确保了测试的可靠性和隔离性，避免了异步操作导致的测试不稳定问题。
