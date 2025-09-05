import { createStore, Store } from 'ccstate'

export function createTestContext() {
    let store: Store | null = null
    let controller = new AbortController()

    const context = {
        get signal(): AbortSignal {
            return controller.signal
        },
        get store(): Store {
            if (!store) {
                // eslint-disable-next-line no-console
                console.debug('create store')
                store = createStore()
                context.signal.addEventListener('abort', () => {
                    store = null
                })
            }
            return store
        },
    } as const

    afterEach(() => {
        // eslint-disable-next-line no-console
        console.debug('cleanup context')
        const error = new Error('Aborted due to finished test')
        error.name = 'AbortError'
        controller.abort(error)
        controller = new AbortController()
    })

    return Object.freeze(context)
}
