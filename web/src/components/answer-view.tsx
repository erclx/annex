import { CitationBlock } from '@/components/citation-block'
import type { Answer } from '@/lib/answer'

/**
 * Claims in the interface's own voice, each with its evidence directly under it.
 *
 * Inline citations won by measurement rather than by preference, recorded under
 * frontend scope in `.claude/ARCHITECTURE.md`. Proximity never breaks: a claim
 * and its evidence need no reference number, no glance sideways, and no click.
 * The cost is vertical run, which is real and was accepted.
 */
export function AnswerView({ answer }: { answer: Answer }) {
  return (
    <div className="flex flex-col">
      {answer.retrieval.truncated && (
        <CutShort
          dropped={answer.retrieval.dropped_ids.length}
          reached={
            answer.retrieval.traversed_ids.length +
            answer.retrieval.searched_ids.length
          }
        />
      )}

      {answer.claims.map((claim, index) => (
        <section
          key={index}
          className="border-b border-rule-soft py-5 last:border-b-0"
        >
          <p className="text-[15.5px] leading-[1.55] text-ink">
            {claim.statement}
          </p>
          {claim.citations.map((citation) => (
            <CitationBlock key={citation.provision_id} citation={citation} />
          ))}
        </section>
      ))}
    </div>
  )
}

/**
 * The banner that separates a cut answer from a finished one.
 *
 * A cut answer reads exactly like a complete one, so nothing but this
 * distinguishes them. Both counts are read off the trace rather than written
 * into the copy.
 */
function CutShort({ dropped, reached }: { dropped: number; reached: number }) {
  return (
    <div className="mt-5 rounded-lg border border-warning bg-warning-surface px-4 py-3">
      <p className="text-[14px] leading-[1.6] text-warning">
        The answer stopped for want of room, not because it finished. {dropped}{' '}
        of the {reached} provisions traversal reached were cut before the model
        read them. They are named under the trace as dropped.
      </p>
    </div>
  )
}
