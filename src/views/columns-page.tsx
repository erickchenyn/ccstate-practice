import { useGet, useSet } from 'ccstate-react'
import type { ColumnInstance, ColumnsPageContext } from '../signals/columns-page'

function ColumnPanel({ ctx, column }: { ctx: ColumnsPageContext; column: ColumnInstance }) {
  const text = useGet(column.text$)
  const charCount = useGet(column.charCount$)
  const updateText = useSet(column.updateText$)
  const removeCol = useSet(ctx.removeColumn$)

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

export default function ColumnsPage({ ctx }: { ctx: ColumnsPageContext }) {
  const cols = useGet(ctx.columns$)
  const addCol = useSet(ctx.addColumn$)

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 60px)' }}>
      {cols.map((col) => (
        <ColumnPanel key={col.id} ctx={ctx} column={col} />
      ))}
      <div style={{ display: 'flex', alignItems: 'center', padding: 16 }}>
        <button onClick={() => addCol()} style={{ cursor: 'pointer', padding: '8px 16px' }}>
          + Add Column
        </button>
      </div>
    </div>
  )
}
