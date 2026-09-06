import type { AskState } from '@/lib/ask'

type FailureState = Extract<
  AskState,
  'unavailable' | 'timeout' | 'failed' | 'unreachable'
>

/**
 * One region, four copy variants, only ever one at a time.
 *
 * Four rather than one because each names a different next action: start the
 * model, narrow the description, quote the id, start the service. A timeout is
 * its own variant rather than a shade of error, because it is the failure where
 * the work started and waiting longer would not have helped.
 *
 * These sentences are owned by the service seam and quoted in
 * `.claude/wireframes/answer.md`. A change to them here is a change to that
 * file.
 */
const COPY: Record<FailureState, { headline: string; next: string }> = {
  unavailable: {
    headline: 'The model or the index is not running.',
    next: 'The service is up and could not reach what it needs. Start the model and ask again.',
  },
  timeout: {
    headline: 'The model did not answer inside the budget.',
    next: 'Waiting longer would not have helped. Narrow the description and ask again.',
  },
  failed: {
    headline: 'Something went wrong that we did not expect.',
    next: 'Quote the correlation id and the log will answer.',
  },
  unreachable: {
    headline: 'Nothing is listening on the service port.',
    next: 'The service is not running. Start it and ask again.',
  },
}

export function FailureRegion({
  state,
  correlationId,
}: {
  state: FailureState
  correlationId?: string
}) {
  const copy = COPY[state]

  return (
    <div
      role="alert"
      className="my-6 rounded-lg border border-error bg-error-surface px-4 py-3"
    >
      <p className="text-[15.5px] leading-[1.55] font-medium text-error">
        {copy.headline}
      </p>
      <p className="mt-1 text-[14px] leading-[1.6] text-ink">{copy.next}</p>
      {/* Absent on `unreachable`: nothing answered, so nothing logged one. */}
      {correlationId && state !== 'unreachable' && (
        <p className="mt-2 font-mono text-[11.5px] text-muted">
          correlation {correlationId}
        </p>
      )}
    </div>
  )
}
