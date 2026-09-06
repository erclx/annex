'use client'

import { useState } from 'react'

import type { Retrieval } from '@/components/versions'
import { citationLabel } from '@/lib/citation'

const SHOWN = 8

/**
 * Cost reported rather than buried, and always on screen.
 *
 * The summary line never collapses. Behind the disclosure sit three id lists,
 * each capped at eight with a count of the rest, because the full-context arm
 * produces lists running to hundreds and an uncapped one would swamp the answer
 * it describes. The count carries the scale and the expansion carries the
 * detail.
 */
export function RetrievalTrace({ retrieval }: { retrieval: Retrieval }) {
  const [open, setOpen] = useState(false)

  return (
    <footer className="border-t border-rule bg-surface">
      <div className="mx-auto w-full max-w-3xl px-6 py-3">
        <button
          type="button"
          aria-expanded={open}
          onClick={() => {
            setOpen(!open)
          }}
          className="flex w-full flex-wrap items-center justify-between gap-2 text-left font-mono text-[11.5px] text-muted"
        >
          <span>
            {retrieval.model} {group(retrieval.prompt_tokens)} prompt{' '}
            {group(retrieval.completion_tokens)} completion{' '}
            {(retrieval.duration_ms / 1000).toFixed(1)} s
          </span>
          <span>
            {retrieval.searched_ids.length} searched ·{' '}
            {retrieval.traversed_ids.length} traversed ·{' '}
            {retrieval.dropped_ids.length} dropped {open ? '▾' : '▸'}
          </span>
        </button>

        {open && (
          <dl className="mt-3 flex flex-col gap-2 border-t border-rule-soft pt-3">
            <IdList label="searched" ids={retrieval.searched_ids} />
            <IdList label="traversed" ids={retrieval.traversed_ids} />
            <IdList
              label="dropped"
              ids={retrieval.dropped_ids}
              note="reached by traversal, cut by the prompt budget, never read"
            />
          </dl>
        )}
      </div>
    </footer>
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
    <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-4">
      <dt className="font-mono text-[10.5px] tracking-[0.08em] text-muted uppercase sm:w-24 sm:shrink-0">
        {label}
      </dt>
      <dd className="font-mono text-[11.5px] leading-[1.6] text-act">
        {shown.length === 0 ? (
          <span className="text-muted">none</span>
        ) : (
          <>
            {shown.map(citationLabel).join(', ')}
            {rest > 0 && <span className="text-muted"> +{rest} more</span>}
          </>
        )}
        {note && ids.length > 0 && (
          <span className="text-muted"> ({note})</span>
        )}
      </dd>
    </div>
  )
}

/** Thousands separated by a space, the way the trace line is drawn. */
function group(value: number): string {
  return value.toLocaleString('en-US').replaceAll(',', ' ')
}
