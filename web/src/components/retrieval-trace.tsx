'use client'

import { useState } from 'react'

import { TraversalGraph } from '@/components/traversal-graph'
import type { Retrieval } from '@/components/versions'

const SHOWN = 8

/**
 * Cost reported rather than buried, and always on screen.
 *
 * The summary line never collapses. Behind the disclosure sit three id lists,
 * each capped at eight with a count of the rest, because the full-context arm
 * produces lists running to hundreds and an uncapped one would swamp the answer
 * it describes. The count carries the scale and the expansion carries the
 * detail.
 *
 * Ids render raw rather than as a reader-facing label. Both the wireframe and
 * the settled design draw them as `art_6.2` and `anx_3.5.b`, which is what
 * keeps eight of them on a line.
 */
export function RetrievalTrace({ retrieval }: { retrieval: Retrieval }) {
  const [open, setOpen] = useState(false)

  return (
    <footer className="border-t border-rule bg-surface font-mono text-[11.5px] text-muted">
      <div className="mx-auto w-full max-w-4xl px-6 py-[11px]">
        <button
          type="button"
          aria-expanded={open}
          onClick={() => {
            setOpen(!open)
          }}
          className="flex w-full flex-wrap items-center justify-between gap-4 text-left"
        >
          <span className="flex flex-wrap gap-4">
            <span className="text-ink">{retrieval.model}</span>
            <span>{group(retrieval.prompt_tokens)} prompt</span>
            <span>{group(retrieval.completion_tokens)} completion</span>
            <span>{(retrieval.duration_ms / 1000).toFixed(1)} s</span>
          </span>
          <span className="text-accent">
            {retrieval.searched_ids.length} searched ·{' '}
            {retrieval.traversed_ids.length} traversed ·{' '}
            {retrieval.dropped_ids.length} dropped {open ? '▾' : '▸'}
          </span>
        </button>

        {open && (
          <div className="mt-[11px] border-t border-rule-soft pt-[11px]">
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

/** Thousands separated by a space, the way the trace line is drawn. */
function group(value: number): string {
  return value.toLocaleString('en-US').replaceAll(',', ' ')
}
