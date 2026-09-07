import { recordedQuestions } from '@/lib/replay'

/**
 * The questions the recording holds, offered so the ordinary path reaches one.
 *
 * The input above these stays free text, which is what makes the unrecorded
 * state reachable at all. Narrowing it to a picker would have removed that
 * state and the surface the design was settled on with it, so the picks sit
 * beside the input rather than in place of it.
 *
 * Grouped by the flow each question serves, because the grouping is the demo's
 * own structure: three questions a flow, and the fourth column of the
 * evaluation is what the walkthrough reads instead of a screen.
 *
 * The groups come from the recording and the labels below only name them, so a
 * flow this file has no label for falls back to its own key rather than
 * dropping every question under it.
 *
 * Copy is owned by `.claude/wireframes/answer.md`.
 */
const FLOW_LABELS: Record<string, string> = {
  transparency: 'Telling a person they are dealing with an AI system',
  'high-risk-chain': 'Whether a system is high risk, and what follows',
  'substantial-modification': 'Changing a system already on the market',
  'version-comparison': 'When an obligation starts to apply',
}

export function RecordedPicks({
  onPick,
}: {
  onPick: (description: string) => void
}) {
  // Grouped from the recording rather than from the map above, so a question
  // whose flow this file has no label for is still offered. Reading the map
  // first dropped it silently instead, and the gold set is a file another row
  // adds to, which would have left a captured question committed and
  // unreachable with nothing reporting it.
  const flows = [...new Set(recordedQuestions.map((question) => question.flow))]

  return (
    <section className="mx-auto w-full max-w-4xl px-6 pb-16">
      <h2 className="m-0 mb-1 text-[13px] font-semibold text-ink">
        Or read one of the recorded questions
      </h2>
      <p className="m-0 mb-4 max-w-[62ch] text-[13px] leading-[1.6] text-muted">
        These are the twelve descriptions the live system was asked, against
        both texts. Anything else reaches a state saying the recording does not
        hold it.
      </p>

      <div className="flex flex-col gap-5">
        {flows.map((flow) => (
          <div key={flow} className="flex flex-col gap-[6px]">
            <span className="font-mono text-[9.5px] tracking-[0.06em] text-muted uppercase">
              {FLOW_LABELS[flow] ?? flow}
            </span>
            {recordedQuestions
              .filter((question) => question.flow === flow)
              .map((question) => (
                <button
                  key={question.id}
                  type="button"
                  onClick={() => {
                    onPick(question.description)
                  }}
                  className="max-w-[62ch] rounded-md border border-rule bg-surface px-[11px] py-[7px] text-left text-[13px] leading-[1.5] text-ink"
                >
                  {question.description}
                </button>
              ))}
          </div>
        ))}
      </div>
    </section>
  )
}
