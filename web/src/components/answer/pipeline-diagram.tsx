import { Fragment } from 'react'

const STAGES = [
  { label: 'Intake', detail: 'a description becomes a structured query' },
  { label: 'Retrieve', detail: 'search finds candidate passages by meaning' },
  { label: 'Traverse', detail: "the Act's own citations expand outward" },
  { label: 'Synthesize', detail: 'an answer is drafted, citing what it read' },
  { label: 'Verify', detail: 'every claim is checked against the text' },
] as const

const BRACKET_START = 1
const BRACKET_END = 2

const CAPTION = 'The comparison switches these two on and off.'

/**
 * The five request-order stages `canon/ARCHITECTURE.md` § Overview names,
 * drawn as a vertical rail rather than a row scaled to the pane's width.
 *
 * The row it replaced sized its type in SVG viewBox units, so every pixel of
 * width the pane lost shrank the type with it, down to 7.1px at 1280 per the
 * first-use pass. A rail stacks stages instead of scaling them, and every
 * label and caption here is plain HTML text at a fixed pixel size, so it
 * holds its floor of 11px regardless of how narrow the column carrying it
 * gets.
 *
 * Retrieve and Traverse are the two stages the comparison switches on and off,
 * so a bracket ties them together and the caption that used to sit under the
 * whole figure reads off that bracket instead. The bracket's grid row spans
 * both stage rows, which grid computes from their actual rendered height, so
 * nothing here depends on measuring the page or guessing a fixed height.
 *
 * Every column is sized to its content and packed to the start, so the bracket
 * sits beside the stage text rather than at the far edge of whatever width the
 * section gives the figure. The caption names no direction, since the table it
 * refers to sits beside the figure at one width and under it at another.
 */
export function PipelineDiagram() {
  return (
    <div
      className="mb-[11px]"
      role="img"
      aria-label={`The five-stage pipeline: ${STAGES.map((stage) => stage.label).join(', ')}. ${CAPTION}`}
    >
      <div
        className="grid grid-cols-[10px_auto_auto] justify-start gap-x-3"
        style={{ gridTemplateRows: `repeat(${STAGES.length}, auto)` }}
      >
        {STAGES.map((stage, index) => {
          const row = index + 1
          const isLast = index === STAGES.length - 1
          const isBracketed = index >= BRACKET_START && index <= BRACKET_END

          return (
            <Fragment key={stage.label}>
              <div
                className="relative flex justify-center"
                style={{ gridRow: row, gridColumn: 1 }}
              >
                <span
                  className={
                    isBracketed
                      ? 'mt-[4px] size-2 shrink-0 rounded-full bg-accent'
                      : 'mt-[4px] size-2 shrink-0 rounded-full border-[1.5px] border-ink bg-surface'
                  }
                />
                {!isLast && (
                  <span
                    className="absolute top-[12px] bottom-0 w-px bg-cite-rule"
                    aria-hidden="true"
                  />
                )}
              </div>

              <div
                style={{ gridRow: row, gridColumn: 2 }}
                className={isLast ? '' : 'pb-4'}
              >
                <div className="text-[12px] font-semibold text-ink">
                  {stage.label}
                </div>
                <p className="mt-0.5 text-[12px] leading-[1.35] text-act">
                  {stage.detail}
                </p>
              </div>
            </Fragment>
          )
        })}

        <div
          style={{
            gridRow: `${BRACKET_START + 1} / ${BRACKET_END + 2}`,
            gridColumn: 3,
          }}
          className="flex items-center gap-2 pb-4"
        >
          <svg
            viewBox="0 0 10 100"
            preserveAspectRatio="none"
            className="h-full w-[10px] shrink-0"
            aria-hidden="true"
          >
            <path
              d="M8,2 C2,2 2,2 2,20 L2,44 C2,50 2,50 8,50 C2,50 2,50 2,56 L2,80 C2,98 2,98 8,98"
              fill="none"
              stroke="var(--color-accent)"
              strokeWidth={1.5}
            />
          </svg>
          <p className="w-[8.5rem] shrink-0 text-[12px] leading-[1.35] text-accent">
            {CAPTION}
          </p>
        </div>
      </div>
    </div>
  )
}
