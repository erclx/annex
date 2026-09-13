const STAGES = [
  { label: 'Intake', detail: 'a description becomes a structured query' },
  { label: 'Retrieve', detail: 'search finds candidate passages by meaning' },
  { label: 'Traverse', detail: "the Act's own citations expand outward" },
  { label: 'Synthesize', detail: 'an answer is drafted, citing what it read' },
  { label: 'Verify', detail: 'every claim is checked against the text' },
] as const

const STAGE_WIDTH = 148
const STAGE_HEIGHT = 46
const GAP = 22

/**
 * The five request-order stages `.claude/ARCHITECTURE.md` § Overview names.
 *
 * Hand-drawn, matching `traversal-graph.tsx`'s own precedent, since five
 * boxes and four arrows need no dependency. Drawn once here rather than a
 * second time as the diagram choice, since the table beside it already
 * carries the three-arm comparison: this shows the one thing the table
 * cannot, which is where retrieval and traversal sit inside one request.
 */
export function PipelineDiagram() {
  const width = STAGES.length * STAGE_WIDTH + (STAGES.length - 1) * GAP
  const height = STAGE_HEIGHT + 34

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="mb-[11px] w-full"
      role="img"
      aria-label={`The five-stage pipeline: ${STAGES.map((stage) => stage.label).join(', ')}`}
    >
      {STAGES.map((stage, index) => {
        const x = index * (STAGE_WIDTH + GAP)
        return (
          <g key={stage.label}>
            <rect
              x={x}
              y={0}
              width={STAGE_WIDTH}
              height={STAGE_HEIGHT}
              fill="var(--color-accent-soft)"
              stroke="var(--color-cite-rule)"
              strokeWidth={1}
            />
            <text
              x={x + STAGE_WIDTH / 2}
              y={18}
              textAnchor="middle"
              className="fill-ink font-mono text-[10.5px] font-semibold tracking-[0.06em] uppercase"
            >
              {stage.label}
            </text>
            <foreignObject
              x={x + 8}
              y={22}
              width={STAGE_WIDTH - 16}
              height={STAGE_HEIGHT - 22}
            >
              <p className="m-0 text-[9.5px] leading-[1.3] text-act">
                {stage.detail}
              </p>
            </foreignObject>
            {index < STAGES.length - 1 && (
              <path
                d={`M${x + STAGE_WIDTH + 4},${STAGE_HEIGHT / 2} L${x + STAGE_WIDTH + GAP - 4},${STAGE_HEIGHT / 2}`}
                stroke="var(--color-cite-rule)"
                strokeWidth={1.5}
                markerEnd="url(#pipeline-arrow)"
              />
            )}
          </g>
        )
      })}
      <text x={0} y={height - 4} className="fill-muted font-mono text-[9px]">
        Retrieve and traverse are what the arms below switch on and off.
      </text>
      <defs>
        <marker
          id="pipeline-arrow"
          viewBox="0 0 8 8"
          refX={7}
          refY={4}
          markerWidth={6}
          markerHeight={6}
          orient="auto-start-reverse"
        >
          <path d="M0,0 L8,4 L0,8 Z" fill="var(--color-cite-rule)" />
        </marker>
      </defs>
    </svg>
  )
}
