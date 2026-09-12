import type { Retrieval } from '@/components/versions'

const ROW_HEIGHT = 15
const TOP_PADDING = 20
const COLUMN_WIDTH = 190
const NODE_LABEL_OFFSET = 9

/**
 * The walk drawn as a layered graph, hop as the column.
 *
 * Picked by looking, per Step 4 of `canon:draft-and-pick`, against a baseline
 * of the three id lists, a non-layered hand-drawn arrangement, and a
 * `d3-hierarchy` tree. Recorded in `.claude/ARCHITECTURE.md` against what it
 * beat. Hop is already computed by the walk, so the column assignment here is
 * arithmetic rather than a layout algorithm, and a dropped provision draws as
 * a dashed outline at its own hop rather than being omitted, since the budget
 * cutting it is itself part of what the trace reports.
 *
 * An edge carries meaning, so it takes `cite-rule` rather than the plain
 * `rule` hairline, per the 3:1 non-text floor recorded in the plan's risks.
 *
 * Renders nothing when `retrieval.edges` is empty, which is every fixture
 * recorded before this field existed and every run with traversal switched
 * off. `RetrievalTrace` falls back to the three id lists in that case, so an
 * edgeless trace degrades to the lists rather than to an empty frame.
 */
export function TraversalGraph({ retrieval }: { retrieval: Retrieval }) {
  if (retrieval.edges.length === 0) {
    return null
  }

  const hopOf = new Map(
    retrieval.edges.map((edge) => [edge.target_id, edge.hop]),
  )
  const dropped = new Set(retrieval.dropped_ids)
  // No floor value needed: the early return above guarantees at least one
  // edge, so hopOf is never empty here.
  const maxHop = Math.max(...hopOf.values())

  const columns: { label: string; ids: readonly string[] }[] = [
    { label: 'searched', ids: retrieval.searched_ids },
  ]
  for (let hop = 0; hop <= maxHop; hop++) {
    const ids = retrieval.traversed_ids.filter((id) => hopOf.get(id) === hop)
    if (ids.length > 0) {
      columns.push({ label: `hop ${hop}`, ids })
    }
  }

  const positions = new Map<string, { x: number; y: number }>()
  columns.forEach((column, columnIndex) => {
    column.ids.forEach((id, rowIndex) => {
      positions.set(id, {
        x: columnIndex * COLUMN_WIDTH,
        y: TOP_PADDING + rowIndex * ROW_HEIGHT,
      })
    })
  })

  const width = (columns.length - 1) * COLUMN_WIDTH + 150
  const height =
    TOP_PADDING +
    Math.max(...columns.map((column) => column.ids.length)) * ROW_HEIGHT

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="mb-[11px] w-full"
      role="img"
      aria-label={`The walk, ${retrieval.searched_ids.length} searched provisions expanding to ${retrieval.traversed_ids.length} traversed over ${maxHop + 1} hops`}
    >
      {retrieval.searched_ids.length > 0 && (
        <rect
          x={-6}
          y={2}
          width={COLUMN_WIDTH - 30}
          height={TOP_PADDING + retrieval.searched_ids.length * ROW_HEIGHT - 6}
          fill="var(--color-accent-soft)"
        />
      )}

      {columns.map((column, columnIndex) => (
        <text
          key={column.label}
          x={columnIndex * COLUMN_WIDTH}
          y={10}
          className="fill-ink font-mono text-[9.5px] font-semibold tracking-[0.08em] uppercase"
        >
          {column.label}
        </text>
      ))}

      {retrieval.edges.map((edge) => {
        const source = positions.get(edge.source_id)
        const target = positions.get(edge.target_id)
        if (!source || !target) {
          return null
        }
        const midX = (source.x + target.x) / 2
        return (
          <path
            key={`${edge.source_id}->${edge.target_id}`}
            d={`M${source.x + 5},${source.y} C${midX},${source.y} ${midX},${target.y} ${target.x - 5},${target.y}`}
            fill="none"
            stroke="var(--color-cite-rule)"
            strokeWidth={1}
          />
        )
      })}

      {columns.map((column) =>
        column.ids.map((id) => {
          const position = positions.get(id)
          if (!position) {
            return null
          }
          const isDropped = dropped.has(id)
          return (
            <g key={id} transform={`translate(${position.x},${position.y})`}>
              <circle
                r={3}
                fill={isDropped ? 'none' : 'var(--color-accent)'}
                stroke={isDropped ? 'var(--color-cite-rule)' : 'none'}
                strokeWidth={isDropped ? 1 : 0}
                strokeDasharray={isDropped ? '1.5 1.5' : undefined}
              />
              <text
                x={NODE_LABEL_OFFSET}
                y={2.5}
                className="fill-ink font-mono text-[8.5px]"
              >
                {id}
              </text>
            </g>
          )
        }),
      )}
    </svg>
  )
}
