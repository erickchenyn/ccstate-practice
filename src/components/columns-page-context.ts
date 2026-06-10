import { command, computed, state, type Command, type Computed } from 'ccstate'

export interface ColumnInstance {
  readonly id: string
  readonly text$: Computed<string>
  readonly charCount$: Computed<number>
  readonly updateText$: Command<void, [string]>
}

function createColumn(id: string): ColumnInstance {
  const internalText$ = state('')

  return {
    id,
    text$: computed((get) => get(internalText$)),
    charCount$: computed((get) => get(internalText$).length),
    updateText$: command(({ set }, value: string) => {
      set(internalText$, value)
    }),
  } as const
}

export function createColumnsPageContext() {
  const internalColumns$ = state<ColumnInstance[]>([])
  const columns$ = computed((get) => get(internalColumns$))

  const addColumn$ = command(({ set }) => {
    const id = crypto.randomUUID()
    const col = createColumn(id)
    set(internalColumns$, (prev) => [...prev, col])
  })

  const removeColumn$ = command(({ set }, id: string) => {
    set(internalColumns$, (prev) => prev.filter((col) => col.id !== id))
  })
  return { columns$, addColumn$, removeColumn$ } as const
}

export type ColumnsPageContext = ReturnType<typeof createColumnsPageContext>
