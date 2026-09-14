import { outcomeLine } from '@/lib/service/recorded-outcome'
import { recordedQuestions } from '@/lib/service/replay'

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
 * Copy is owned by `canon/wireframes/answer.md`.
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
    <section className="w-full border-t border-rule pt-6 pb-10">
      <h2 className="m-0 mb-1 text-[15px] font-semibold text-ink">
        Or start from a recorded question
      </h2>
      <p className="m-0 mb-5 max-w-[62ch] text-[13px] leading-[1.6] text-muted">
        Twelve descriptions were put to the live system, on both versions of the
        Act. A description outside those twelve has no recorded answer here.
      </p>

      <div className="flex flex-col gap-5">
        {flows.map((flow) => (
          <div key={flow} className="flex flex-col gap-2">
            <span className="text-[12px] font-medium text-muted">
              {FLOW_LABELS[flow] ?? flow}
            </span>
            <div className="grid grid-cols-1 gap-2 lg:grid-cols-3">
              {recordedQuestions
                .filter((question) => question.flow === flow)
                .map((question) => (
                  // Named by the description alone, so a pick is found by
                  // what was asked, and the outcome is read as its description.
                  <button
                    key={question.id}
                    type="button"
                    aria-label={question.description}
                    aria-describedby={`outcome-${question.id}`}
                    onClick={() => {
                      onPick(question.description)
                    }}
                    className="flex h-full flex-col justify-between gap-3 rounded-lg border border-rule bg-surface px-3 py-[10px] text-left text-[13px] leading-[1.5] text-ink hover:border-cite-rule"
                  >
                    <span>{question.description}</span>
                    <span
                      id={`outcome-${question.id}`}
                      className="text-[11.5px] leading-[1.4] text-muted"
                    >
                      {outcomeLine(question.refused)}
                    </span>
                  </button>
                ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
