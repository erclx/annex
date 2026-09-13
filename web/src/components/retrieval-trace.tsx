'use client'

import { useState } from 'react'

import { TraversalGraph } from '@/components/traversal-graph'
import type { Retrieval } from '@/components/versions'
import { group } from '@/lib/format'

const SHOWN = 8

/**
 * Cost reported rather than buried, and always on screen.
 *
 * The cost line closes the answer column and never collapses. Its counts open
 * the walk: in the pane beside the answer when `onOpenWalk` is supplied, which
 * is every viewport wide enough to dock one, and in place under the line
 * otherwise. The drawing needs more width than the answer column has, which is
 * why it moves out of the column wherever a pane exists.
 */
export function RetrievalTrace({
  retrieval,
  onOpenWalk,
}: {
  retrieval: Retrieval
  onOpenWalk?: () => void
}) {
  const [open, setOpen] = useState(false)
  const opensInPane = onOpenWalk !== undefined

  return (
    <footer className="mt-8 border-t border-rule py-[11px] font-mono text-[11.5px] text-muted">
      <button
        type="button"
        aria-expanded={opensInPane ? undefined : open}
        onClick={() => {
          if (onOpenWalk) {
            onOpenWalk()
            return
          }
          setOpen(!open)
        }}
        className="flex w-full flex-wrap items-center justify-between gap-x-4 gap-y-1 text-left"
      >
        <span className="flex flex-wrap gap-x-4">
          <span className="text-ink">{retrieval.model}</span>
          <span>{group(retrieval.prompt_tokens)} prompt</span>
          <span>{group(retrieval.completion_tokens)} completion</span>
          <span>{(retrieval.duration_ms / 1000).toFixed(1)} s</span>
        </span>
        <span className="text-accent">
          {retrieval.searched_ids.length} searched ·{' '}
          {retrieval.traversed_ids.length} traversed ·{' '}
          {retrieval.dropped_ids.length} dropped{' '}
          {opensInPane ? '→ walk in pane' : open ? '▾' : '▸'}
        </span>
      </button>

      {!opensInPane && open && (
        <div className="mt-[11px] border-t border-rule-soft pt-[11px]">
          <Walk retrieval={retrieval} />
        </div>
      )}
    </footer>
  )
}

/**
 * The walk drawn, with the three id lists under it as its text equivalent.
 *
 * The lists stay beside the drawing rather than behind it, since they are what
 * a screen reader reads and removing them to make room would remove that.
 */
export function Walk({ retrieval }: { retrieval: Retrieval }) {
  return (
    <div className="font-mono text-[11.5px] text-muted">
      <TraversalGraph retrieval={retrieval} />
      <dl className="grid grid-cols-[96px_1fr] gap-x-4 gap-y-[7px] text-[11px]">
        <IdList label="searched" ids={retrieval.searched_ids} />
        <IdList label="traversed" ids={retrieval.traversed_ids} />
        <IdList
          label="dropped"
          ids={retrieval.dropped_ids}
          note="Reached by traversal, cut by the prompt budget, never read."
        />
      </dl>
    </div>
  )
}

/**
 * Dropped ids sit beside traversed ids and are never omitted.
 *
 * Traversal reaches more provisions than a prompt has room for, so reporting
 * what it found without reporting what the budget cut overstates what the
 * answer rests on.
 */
function IdList({
  label,
  ids,
  note,
}: {
  label: string
  ids: readonly string[]
  note?: string
}) {
  const shown = ids.slice(0, SHOWN)
  const rest = ids.length - shown.length

  return (
    <>
      <dt className="text-ink">{label}</dt>
      <dd
        className={`m-0 leading-[1.6] break-words ${note ? 'text-warning' : ''}`}
      >
        {shown.length === 0 ? (
          'none'
        ) : (
          <>
            {shown.join(', ')}
            {rest > 0 && (
              <span className="whitespace-nowrap text-accent">
                {' '}
                +{rest} more
              </span>
            )}
            {/* The settled design separates the clause from the ids with an em
                dash, which the UI copy rule bans, so a full stop closes the
                list instead. Without a separator the last id runs into the
                sentence and reads as part of it. */}
            {note && <span>. {note}</span>}
          </>
        )}
      </dd>
    </>
  )
}
