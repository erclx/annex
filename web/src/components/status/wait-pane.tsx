'use client'

import { useEffect, useState } from 'react'

import { ReadingCard } from '@/components/answer/reading-card'
import { WalkChips } from '@/components/answer/walk-chips'
import type { CorpusVersion } from '@/components/shared/versions'
import type { WalkProgress } from '@/lib/service/walk-progress'

/** How long the walk takes to grow once its ids have arrived. */
export const REVEAL_MS = 1800

/** How far into drafting the pane turns from the walk to the reading card. */
export const CARD_DELAY_MS = 2000

const REDUCED_MOTION = '(prefers-reduced-motion: reduce)'

/**
 * The docked pane while a question runs, so the right half is never empty.
 *
 * First the walk grows as search and traversal report what they reached. Live,
 * both land within 50 milliseconds after a 13-second restating step, so the
 * growth is paced over ids that already arrived rather than timed to anything
 * the service did. Once drafting has run for a moment the walk collapses to a
 * line and the card shows what the model was supplied, because the draft that
 * shrank the walk to share the pane put its type near 6 pixels.
 */
export function WaitPane({
  progress,
  version,
}: {
  progress: WalkProgress
  version: CorpusVersion
}) {
  const searched = progress.searchedIds ?? []
  const traversed = progress.traversedIds ?? []
  const total = new Set(searched).size + traversed.length
  const revealed = useReveal(total)
  const isReading = useElapsedSince(progress.suppliedAt, CARD_DELAY_MS)
  const dropped = progress.droppedIds

  return (
    <aside
      aria-label="The agent working"
      className="sticky top-[var(--annex-bar-height,0px)] flex h-[calc(100vh-var(--annex-bar-height,0px))] flex-col border-l border-rule bg-surface"
    >
      <header className="flex items-center justify-between gap-3 border-b border-rule px-5 py-[10px]">
        <h2 className="m-0 text-[11px] font-normal text-muted">
          {isReading ? 'What the model is reading' : 'The walk, as it happens'}
        </h2>
        <span className="font-mono text-[11px] text-muted">
          {new Set(searched).size} searched · {traversed.length} traversed
        </span>
      </header>

      <div className="flex-1 overflow-auto px-5 py-4">
        {progress.searchedIds === null ? (
          <p className="m-0 text-[14px] text-muted">
            Waiting for search to return.
          </p>
        ) : isReading && progress.suppliedIds !== null ? (
          <div className="flex flex-col gap-5">
            <p className="m-0 text-[13px] text-act">
              The walk: {new Set(searched).size} found by search,{' '}
              {traversed.length} reached, {dropped?.length ?? 0} set aside
            </p>
            <ReadingCard suppliedIds={progress.suppliedIds} version={version} />
          </div>
        ) : (
          <WalkChips
            walk={{
              searched_ids: searched,
              traversed_ids: traversed,
              edges: progress.edges ?? [],
              dropped_ids: dropped,
            }}
            version={version}
            revealed={revealed}
          />
        )}
      </div>
    </aside>
  )
}

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia(REDUCED_MOTION).matches
  )
}

/**
 * How many of `total` items have appeared, growing over `REVEAL_MS`.
 *
 * The count only grows, so ids arriving on a later frame extend the reveal
 * from where it stood rather than hiding what was already shown.
 */
function useReveal(total: number): number {
  const [count, setCount] = useState(0)
  const isStill = prefersReducedMotion()
  const isComplete = isStill || count >= total

  useEffect(() => {
    if (isComplete) return
    const timer = setInterval(
      () => {
        setCount((current) => current + 1)
      },
      Math.max(16, REVEAL_MS / total),
    )
    return () => {
      clearInterval(timer)
    }
  }, [isComplete, total])

  return isStill ? total : Math.min(count, total)
}

/** Whether `delayMs` has passed since the moment `since` names. */
function useElapsedSince(since: number | null, delayMs: number): boolean {
  const [elapsedFor, setElapsedFor] = useState<number | null>(null)

  useEffect(() => {
    if (since === null) return
    const timer = setTimeout(() => {
      setElapsedFor(since)
    }, delayMs)
    return () => {
      clearTimeout(timer)
    }
  }, [since, delayMs])

  return since !== null && elapsedFor === since
}
