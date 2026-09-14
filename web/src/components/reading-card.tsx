'use client'

import { useEffect, useState } from 'react'

import type { CorpusVersion } from '@/components/versions'
import { citationLabel, findProvision } from '@/lib/corpus'

/** How long each supplied provision stays on the card. */
export const CYCLE_MS = 3500

/**
 * What the model is reading while it drafts, one supplied provision at a time.
 *
 * The provisions are the set the budget actually handed the model, never the
 * finished answer's citations. No citation exists while drafting runs, and the
 * supplied set is both narrower than what the walk reached, since the budget
 * cut some, and wider than what the answer keeps, since the model and the
 * grounding check drop more. So the caption says being read, and nothing on
 * the card says cited. Picked with that correction in the first-use operator
 * pass (O2, arm 3b).
 *
 * The text comes from the corpus export the page already ships, since the
 * stream carries ids rather than statute text.
 */
export function ReadingCard({
  suppliedIds,
  version,
}: {
  suppliedIds: readonly string[]
  version: CorpusVersion
}) {
  const ids = [...new Set(suppliedIds)]
  const [step, setStep] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => {
      setStep((current) => current + 1)
    }, CYCLE_MS)
    return () => {
      clearInterval(timer)
    }
  }, [])

  if (ids.length === 0) return null
  const index = step % ids.length
  const id = ids[index]
  const text = findProvision(version, id)?.text ?? ''

  return (
    <section
      aria-label="Being read by the model"
      className="border-l-2 border-cite-rule py-1 pl-[14px]"
    >
      <p className="m-0 text-[11px] text-muted">
        Being read by the model · {index + 1} of {ids.length} supplied
      </p>
      <h3 className="mt-1 mb-[2px] text-[13px] font-semibold text-accent">
        {citationLabel(version, id)}
      </h3>
      <p className="m-0 line-clamp-6 font-[family-name:var(--font-serif)] text-[13px] leading-[1.5] text-act">
        {text}
      </p>
    </section>
  )
}
