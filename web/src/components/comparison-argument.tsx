import { PipelineDiagram } from '@/components/pipeline-diagram'
import {
  armSummaries,
  type ArmSummary,
  embeddingModel,
  generationModel,
} from '@/lib/evaluation-summary'

const HARDWARE = 'one RTX 5090'
const BASELINE_MODEL = 'annex-longctx'

const ARM_LABEL: Record<ArmSummary['arm'], string> = {
  'full-context': 'Full context',
  'search-only': 'Search only',
  'search-traversal': 'Search + traversal',
}

const VERSION_LABEL: Record<ArmSummary['version'], string> = {
  original: 'Original',
  consolidated: 'Amended',
}

const ARM_ORDER: ArmSummary['arm'][] = [
  'full-context',
  'search-only',
  'search-traversal',
]

/**
 * The three-arm comparison, filling the region `before-you-ask.tsx` reserved.
 *
 * Sourced from `python/data/eval/results.json` through the generated
 * `evaluation-summary.json` fixture rather than transcribed, so the table
 * moves when the next `evaluate` run does. Recall, precision, faithfulness
 * and cost are read straight off that fixture. Refusal is too, and it is
 * captioned rather than trusted the way the other columns are: three
 * questions per arm and version is a small enough sample that the project's
 * own account of it, in `docs/evaluation.md`, calls it a direction rather
 * than a rate.
 */
export function ComparisonArgument() {
  const arms = armSummaries()
  const ordered = [...arms].sort((a, b) => {
    const byArm = ARM_ORDER.indexOf(a.arm) - ARM_ORDER.indexOf(b.arm)
    return byArm !== 0 ? byArm : a.version.localeCompare(b.version)
  })

  return (
    <section>
      <span className="font-mono text-[10.5px] tracking-[0.08em] text-muted uppercase">
        The three-arm comparison
      </span>

      <p className="mt-2 text-[12px] leading-[1.5] text-act">
        The Act fits inside a current context window, so a model can read the
        whole document and answer from it. That makes retrieval something to
        justify rather than assume, so the same twelve questions were answered
        three ways: reading the whole Act, search alone, and search with
        reference traversal, then scored the same way on what each arm read and
        what it cost.
      </p>

      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[380px] border-collapse text-[11px]">
          <thead>
            <tr className="border-b border-rule text-left text-muted">
              <th className="py-1 pr-2 font-normal">Arm</th>
              <th className="py-1 pr-2 font-normal">Text</th>
              <th className="py-1 pr-2 text-right font-normal">Recall</th>
              <th className="py-1 pr-2 text-right font-normal">Faithful</th>
              <th className="py-1 pr-2 text-right font-normal">Nodes</th>
              <th className="py-1 text-right font-normal">Refused</th>
            </tr>
          </thead>
          <tbody>
            {ordered.map((row) => (
              <tr
                key={`${row.arm}-${row.version}`}
                className="border-b border-rule-soft"
              >
                <td className="py-1 pr-2 text-ink">{ARM_LABEL[row.arm]}</td>
                <td className="py-1 pr-2 text-act">
                  {VERSION_LABEL[row.version]}
                </td>
                <td className="py-1 pr-2 text-right text-act">
                  {row.recall.toFixed(2)}
                </td>
                <td className="py-1 pr-2 text-right text-act">
                  {row.faithfulness === null
                    ? 'not scored'
                    : row.faithfulness.toFixed(2)}
                </td>
                <td className="py-1 pr-2 text-right text-act">
                  {row.nodes_supplied.toFixed(1)}
                </td>
                <td className="py-1 text-right text-act">
                  {row.correct_refusals}/{row.refusal_questions}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-2 text-[11px] leading-[1.5] text-muted">
        Faithfulness is matched against what an arm was supplied, so the
        baseline is compared against its own document-wide vocabulary rather
        than the dozen or so nodes the retrieval arms read. Refused is scored
        over three questions the text does not settle, per arm and text: too few
        to rank the arms on, and read here as a direction rather than a rate.
      </p>

      <p className="mt-3 text-[11px] leading-[1.5] text-muted">
        Run on {HARDWARE}. The baseline generates with {BASELINE_MODEL}; search
        and traversal generate with {generationModel()} over an index built with{' '}
        {embeddingModel()}. Nothing here was paid for, so every cost figure is a
        projection at a stated hosted rate rather than a bill.
      </p>

      <div className="mt-4">
        <PipelineDiagram />
      </div>
    </section>
  )
}
