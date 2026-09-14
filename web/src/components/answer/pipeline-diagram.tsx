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
 * drawn as a vertical rail at most widths and, in the band where the
 * comparison's two halves stack and five stage columns fit, as a horizontal
 * row instead.
 *
 * The row it replaced sized its type in SVG viewBox units, so every pixel of
 * width the pane lost shrank the type with it, down to 7.1px at 1280 per the
 * first-use pass. A rail stacks stages instead of scaling them, and every
 * label and caption here is plain HTML text at a fixed pixel size, so it
 * holds its floor of 11px regardless of how narrow the column carrying it
 * gets. The rail alone left roughly half of a stacked mid-width row empty
 * beside it, 42 percent at 810px and 54 percent at 1024px, measured at the
 * third-use pass, so the row fills that width instead of leaving it blank.
 *
 * Both drawings render in the DOM and switch on the component's own rendered
 * width through a `@container` query, the pattern `walk-chips.tsx` already
 * uses, rather than on any prop or on `comparison-argument.tsx`'s stacked
 * state: `comparison-argument.tsx` only decides whether the two halves sit
 * side by side, and this component's own slot can still be narrower than
 * that switch implies (a docked pane, say), so it has to measure itself.
 *
 * Retrieve and Traverse are the two stages the comparison switches on and off,
 * so a bracket ties them together in both drawings and the caption that used
 * to sit under the whole figure reads off that bracket instead. The rail's
 * bracket spans a grid row range grid computes from the stages' own rendered
 * height. The row's bracket is a separate, purpose-built horizontal path
 * rather than the rail's path rotated, since a `rotate()` on a hand-tuned
 * curve skews its corner radii unevenly at a different aspect ratio.
 *
 * The 657px breakpoint below was measured on the built page at a 1024px
 * window: five stage columns hold their labels on one line down to 657px of
 * the component's own rendered width, and the shortest label starts
 * wrapping just below it. Tailwind's scanner reads class names as literal
 * source text, so the value is written into both class strings below rather
 * than interpolated from a constant.
 */
export function PipelineDiagram() {
  const label = `The five-stage pipeline: ${STAGES.map((stage) => stage.label).join(', ')}. ${CAPTION}`

  return (
    <div className="mb-[11px] @container" role="img" aria-label={label}>
      <div className="@min-[657px]:hidden">
        <VerticalRail />
      </div>
      <div className="hidden @min-[657px]:block">
        <HorizontalRow />
      </div>
    </div>
  )
}

function VerticalRail() {
  return (
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
              <span className={dotClassName(isBracketed, 'mt-[4px]')} />
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
  )
}

function HorizontalRow() {
  return (
    <div
      className="grid items-start gap-x-3"
      style={{
        gridTemplateColumns: `repeat(${STAGES.length}, minmax(0, auto))`,
      }}
    >
      {STAGES.map((stage, index) => {
        const column = index + 1
        const isLast = index === STAGES.length - 1
        const isBracketed = index >= BRACKET_START && index <= BRACKET_END

        return (
          <Fragment key={stage.label}>
            <div
              className="relative flex h-2 items-center"
              style={{ gridRow: 1, gridColumn: column }}
            >
              <span className={dotClassName(isBracketed)} />
              {!isLast && (
                <span
                  className="absolute top-1/2 left-[12px] h-px w-[calc(100%+12px)] -translate-y-1/2 bg-cite-rule"
                  aria-hidden="true"
                />
              )}
            </div>

            <div style={{ gridRow: 2, gridColumn: column }} className="pt-2">
              <div className="text-[11px] font-semibold text-ink">
                {stage.label}
              </div>
              <p className="mt-0.5 text-[11px] leading-[1.35] text-act">
                {stage.detail}
              </p>
            </div>
          </Fragment>
        )
      })}

      <div
        style={{
          gridRow: 3,
          gridColumn: `${BRACKET_START + 1} / ${BRACKET_END + 2}`,
        }}
        className="mt-2 flex flex-col gap-1"
      >
        <svg
          viewBox="0 0 100 10"
          preserveAspectRatio="none"
          className="h-[10px] w-full shrink-0"
          aria-hidden="true"
        >
          <path
            d="M2,2 C2,8 2,8 20,8 L44,8 C50,8 50,8 50,2 C50,8 50,8 56,8 L80,8 C98,8 98,8 98,2"
            fill="none"
            stroke="var(--color-accent)"
            strokeWidth={1.5}
          />
        </svg>
        <p className="text-[11px] leading-[1.35] text-accent">{CAPTION}</p>
      </div>
    </div>
  )
}

function dotClassName(isBracketed: boolean, extra = ''): string {
  const base = isBracketed
    ? 'size-2 shrink-0 rounded-full bg-accent'
    : 'size-2 shrink-0 rounded-full border-[1.5px] border-ink bg-surface'
  return extra ? `${extra} ${base}` : base
}
