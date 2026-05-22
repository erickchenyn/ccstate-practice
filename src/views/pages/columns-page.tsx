import { command, computed, state, type Command, type Computed } from 'ccstate'
import { useGet, useSet } from 'ccstate-react'

interface ColumnInstance {
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

function ColumnPanel({ column }: { column: ColumnInstance }) {
  const text = useGet(column.text$)
  const charCount = useGet(column.charCount$)
  const updateText = useSet(column.updateText$)
  const removeCol = useSet(removeColumn$)

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        minWidth: 200,
        borderRight: '1px solid #ddd',
      }}
    >
      <textarea
        style={{
          flex: 1,
          resize: 'none',
          border: 'none',
          padding: 8,
          outline: 'none',
          fontFamily: 'inherit',
        }}
        value={text}
        onChange={(e) => updateText(e.target.value)}
        placeholder="Type here..."
      />
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '4px 8px',
          borderTop: '1px solid #eee',
          fontSize: 12,
          color: '#666',
        }}
      >
        <span>{charCount} chars</span>
        <button
          style={{
            fontSize: 12,
            cursor: 'pointer',
            color: '#c00',
            background: 'none',
            border: 'none',
          }}
          onClick={() => removeCol(column.id)}
        >
          Delete
        </button>
      </div>
    </div>
  )
}

export default function ColumnsPage() {
  const cols = useGet(columns$)
  const addCol = useSet(addColumn$)

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 60px)' }}>
      {cols.map((col) => (
        <ColumnPanel key={col.id} column={col} />
      ))}
      <div style={{ display: 'flex', alignItems: 'center', padding: 16 }}>
        <button onClick={() => addCol()} style={{ cursor: 'pointer', padding: '8px 16px' }}>
          + Add Column
        </button>
      </div>
    </div>
  )
}
