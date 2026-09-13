'use client'

import { useEffect, useState } from 'react'

import { type CorpusVersion, VERSION_LABEL } from '@/components/versions'
import { citationLabel } from '@/lib/corpus'
import {
  type StepKey,
  stepStates,
  type StepStatus,
  type WalkProgress,
} from '@/lib/walk-progress'

const TICK_MS = 100
const NAMED = 3

/**
 * The wait, as the steps the agent is actually taking.
 *
 * Each step shows a dot, its own elapsed time, and what it reached once it
 * finishes, read off the stream's frames. The times are the reader's own
 * wait, measured in the browser as each frame arrives, so nothing here states
 * a duration that did not happen. Picked as arm 3b in the first-use operator
 * pass, and the only thing on this surface that moves while nothing else does:
 * `canon/DESIGN.md` § Motion says what may.
 */
export function AgentSteps({
  progress,
  version,
}: {
  progress: WalkProgress
  version: CorpusVersion
}) {
  const now = useNow(TICK_MS)
  const states = stepStates(progress, now)
  const elapsed = Math.max(0, now - progress.startedAt)

  return (
    <section aria-label="The agent working" className="py-6">
      <ol className="m-0 flex list-none flex-col p-0">
        {states.map((status) => (
          <Step
            key={status.step}
            status={status}
            label={labelFor(status.step, version)}
            result={resultFor(status, progress, version)}
          />
        ))}
      </ol>
      <p className="mt-[14px] font-mono text-[12px] text-muted">
        Elapsed {formatDuration(elapsed)}
      </p>
    </section>
  )
}

function Step({
  status,
  label,
  result,
}: {
  status: StepStatus
  label: string
  result: string | null
}) {
  const isRunning = status.state === 'running'

  return (
    <li
      aria-current={isRunning ? 'step' : undefined}
      className="grid grid-cols-[22px_1fr_auto] gap-x-[10px] border-b border-rule-soft py-[9px]"
    >
      <span
        aria-hidden="true"
        className={`mt-[5px] h-3 w-3 rounded-full border-[1.5px] ${
          status.state === 'done'
            ? 'border-cite-rule bg-cite-rule'
            : isRunning
              ? 'animate-step-pulse border-accent bg-accent motion-reduce:animate-none'
              : 'border-cite-rule'
        }`}
      />
      <span
        className={`text-[14px] ${status.state === 'pending' ? 'text-muted' : 'text-ink'}`}
      >
        {label}
      </span>
      <span className="font-mono text-[12px] text-muted">
        {status.elapsedMs === null ? '' : formatDuration(status.elapsedMs)}
      </span>
      {result !== null && (
        <span className="col-start-2 col-end-4 mt-[3px] text-[12.5px] text-act">
          {result}
        </span>
      )}
    </li>
  )
}

function labelFor(step: StepKey, version: CorpusVersion): string {
  switch (step) {
    case 'route':
      return 'Restating your description as a search query'
    case 'retrieve':
      return `Searching ${VERSION_LABEL[version]} by meaning`
    case 'traverse':
      return "Following the Act's own cross-references"
    case 'draft':
      return 'Drafting an answer that cites what it read'
  }
}

function resultFor(
  { step, state }: StepStatus,
  progress: WalkProgress,
  version: CorpusVersion,
): string | null {
  if (step === 'draft') {
    return progress.droppedIds === null ? null : budgetResult(progress)
  }
  if (state !== 'done') return null

  switch (step) {
    case 'route':
      return 'Query ready'
    case 'retrieve':
      return searchResult(progress.searchedIds ?? [], version)
    case 'traverse':
      return walkResult(progress)
  }
}

function searchResult(ids: readonly string[], version: CorpusVersion): string {
  const unique = [...new Set(ids)]
  const named = unique
    .slice(0, NAMED)
    .map((id) => citationLabel(version, id))
    .join(', ')
  const rest = unique.length - NAMED
  return `${plural(unique.length, 'provision')} matched: ${named}${
    rest > 0 ? ` and ${rest} more` : ''
  }`
}

function walkResult(progress: WalkProgress): string {
  const traversed = progress.traversedIds ?? []
  const edges = progress.edges ?? []
  if (traversed.length === 0)
    return 'Nothing reached beyond what search matched'

  const lifted = edges.filter((edge) => edge.hop === 0).length
  const hops = Math.max(0, ...edges.map((edge) => edge.hop)) + 1
  return `${plural(traversed.length, 'provision')} reached in ${plural(hops, 'hop')}, ${lifted} lifted to their article and ${
    traversed.length - lifted
  } cited from there`
}

function budgetResult(progress: WalkProgress): string {
  const found = new Set([
    ...(progress.searchedIds ?? []),
    ...(progress.traversedIds ?? []),
  ]).size
  const dropped = new Set(progress.droppedIds).size
  return dropped === 0
    ? `All ${plural(found, 'provision')} found fit the prompt budget`
    : `${dropped} of the ${plural(found, 'provision')} found set aside to fit the prompt budget`
}

function plural(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? '' : 's'}`
}

function formatDuration(ms: number): string {
  return ms < 1000 ? `${Math.round(ms)} ms` : `${(ms / 1000).toFixed(1)} s`
}

/** The current time, re-read on an interval while the component is mounted. */
function useNow(intervalMs: number): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now())
    }, intervalMs)
    return () => {
      clearInterval(timer)
    }
  }, [intervalMs])
  return now
}
