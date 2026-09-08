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
      className="my-6 rounded-lg border border-error/30 bg-error-surface px-[17px] py-[15px]"
    >
      <b className="mb-[3px] block text-[14px] text-error">{copy.headline}</b>
      <p className="m-0 text-[13px] leading-[1.5] text-error">{copy.next}</p>
      {/* Absent on `unreachable`: nothing answered, so nothing logged one. */}
      {correlationId && state !== 'unreachable' && (
        <span className="mt-2 block font-mono text-[11px] text-muted">
          correlation {correlationId}
        </span>
      )}
    </div>
  )
}
