import { CitationBlock } from '@/components/citation-block'
import type { CorpusVersion } from '@/components/versions'
import type { Answer } from '@/lib/answer'

/**
 * Claims in the interface's own voice, each with its evidence directly under it.
 *
 * Inline citations won by measurement rather than by preference, recorded under
 * frontend scope in `.claude/ARCHITECTURE.md`. Proximity never breaks: a claim
 * and its evidence need no reference number, no glance sideways, and no click.
 * The cost is vertical run, which is real and was accepted.
 *
 * Claims are separated by space rather than by a rule. The left rule under each
 * claim already marks where the evidence starts, and a second horizontal line
 * competes with it.
 */
export function AnswerView({
  answer,
  onOpenProvision,
}: {
  answer: Answer
  onOpenProvision?: (provisionId: string, version: CorpusVersion) => void
}) {
  return (
    <div className="py-6">
      {answer.claims.map((claim, index) => (
        <section key={index} className="mb-6 last:mb-0">
          <p className="m-0 text-[15.5px] leading-[1.55] text-ink">
            {claim.statement}
          </p>
          {claim.citations.map((citation) => (
            <CitationBlock
              key={citation.provision_id}
              citation={citation}
              onOpen={onOpenProvision}
            />
          ))}
        </section>
      ))}

      {answer.retrieval.truncated && (
        <CutShort
          dropped={answer.retrieval.dropped_ids.length}
          reached={
            answer.retrieval.traversed_ids.length +
            answer.retrieval.searched_ids.length
          }
        />
      )}
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
    <div className="mt-6 rounded-[7px] border border-warning/30 bg-warning-surface px-[13px] py-[11px]">
      <b className="mb-[2px] block text-[13px] text-warning">
        The answer stopped for want of room, not because it finished.
      </b>
      <p className="m-0 text-[12.5px] leading-[1.5] text-warning">
        {dropped} of the {reached} provisions traversal reached were cut before
        the model read them. They are named under the trace as dropped.
      </p>
    </div>
  )
}
