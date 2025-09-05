import { command, computed, state, type Command, type Computed } from 'ccstate'
import { createResetSignal } from './reset-signal'

export function createSwitchSignal(): {
    switch$: Command<AbortSignal, AbortSignal[]>
    signal$: Computed<AbortSignal>
} {
    const { reset$: resetSignal$ } = createResetSignal()
    const internalSignal$ = state<AbortSignal>(AbortSignal.abort())

    return {
        switch$: command(({ set }, ...signals: AbortSignal[]) => {
            const resetSignal = set(resetSignal$, ...signals)
            set(internalSignal$, resetSignal)
            return resetSignal
        }),
        signal$: computed(get => {
            return get(internalSignal$)
        }),
    }
}

export function createSwitchContext({
    init$,
    switch$,
    clear$,
}: {
    init$?: Command<Promise<void>, [AbortSignal]>
    switch$?: Command<Promise<void>, [AbortSignal]>
    clear$?: Command<void, never[]>
}) {
    const { switch$: switchSignal$, signal$ } = createSwitchSignal()
    const internalSwitch$ = command(async ({ get, set }) => {
        const signal = get(signal$)
        const switchSignal = set(switchSignal$, signal)
        if (switch$) {
            await set(switch$, switchSignal)
        }
    })
    const internalInit$ = command(async ({ set }, signal: AbortSignal) => {
        const initSignal = set(switchSignal$, signal)
        if (init$) {
            await set(init$, initSignal)
        }
        initSignal.addEventListener('abort', () => {
            if (clear$) {
                set(clear$)
            }
        })
    })
    return {
        init$: internalInit$,
        switch$: internalSwitch$,
    } as const
}
