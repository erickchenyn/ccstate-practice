import { command, computed, state } from 'ccstate'

const INIT = Symbol('INIT')

export function createSimpleState<T>(initValue?: T) {
    const valueOrInit$ = state<T | typeof INIT>(INIT)
    return {
        value$: computed(get => {
            const value = get(valueOrInit$)
            if (value === INIT) {
                return initValue
            }
            return value
        }),
        dirty$: computed(get => {
            return get(valueOrInit$) !== INIT
        }),
        update$: command(({ set }, value: T) => {
            set(valueOrInit$, value)
            return value
        }),
        reset$: command(({ set }) => {
            set(valueOrInit$, INIT)
            return initValue
        }),
    }
}
