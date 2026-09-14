import type { ReactNode } from 'react'

import { VersionToggle } from '@/components/top-bar'
import type { CorpusVersion } from '@/components/versions'

const LABEL_ID = 'described-system-label'

/**
 * The card naming what was asked, at the head of the answer column in every
 * state after the empty one.
 *
 * Editing returns the surface to its empty state with the previous text still
 * in the input, which is why this offers a control rather than only a label.
 * The description is never cut, since it is the one thing on the page the
 * visitor wrote.
 *
 * The version toggle sits here and nowhere else once something is asked, beside
 * the description it re-asks, per the operator's second-use pass, which found
 * the bar's toggle and the pane's drawn identically on two different pieces of
 * state. `traversal` is the switch below 1024 pixels, where the bar holds no
 * control and the card is the one place a re-asking choice can sit.
 */
export function DescribedSystem({
  description,
  onEdit,
  version,
  onVersionChange,
  pending,
  traversal,
}: {
  description: string
  onEdit?: () => void
  version: CorpusVersion
  onVersionChange: (version: CorpusVersion) => void
  pending: boolean
  traversal?: ReactNode
}) {
  return (
    <section
      aria-labelledby={LABEL_ID}
      className="mt-6 rounded-lg border border-rule bg-surface px-4 py-3"
    >
      <div className="flex items-baseline justify-between gap-3">
        <h2 id={LABEL_ID} className="m-0 text-[12px] font-medium text-muted">
          The system you described
        </h2>
        {onEdit && (
          <button
            type="button"
            onClick={onEdit}
            className="shrink-0 text-[12px] text-accent underline-offset-2 hover:underline"
          >
            Edit description
          </button>
        )}
      </div>
      <p className="m-0 mt-1 text-[15px] leading-[1.5] text-ink">
        {description}
      </p>

      <div className="mt-3 flex flex-col items-start gap-2 border-t border-rule-soft pt-3">
        <div className="flex flex-col items-start gap-x-3 gap-y-2 lg:flex-row lg:items-center">
          <span className="text-[12px] text-muted">Answered against</span>
          <VersionToggle
            version={version}
            onVersionChange={onVersionChange}
            disabled={pending}
          />
        </div>
        {traversal}
      </div>
    </section>
  )
}
