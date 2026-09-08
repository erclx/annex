import type { AskState } from '@/lib/ask'

type FailureState = Extract<
  AskState,
  'unavailable' | 'timeout' | 'failed' | 'unreachable' | 'unrecorded'
>

/**
 * One region, five copy variants, only ever one at a time.
 *
 * Five rather than one because each names a different next action: start the
 * model, narrow the description, quote the id, start the service, pick a
 * recorded question. A timeout is its own variant rather than a shade of error,
 * because it is the failure where the work started and waiting longer would not
 * have helped.
 *
 * `unrecorded` is the odd one out and is not a failure of anything. The
 * deployed build replays a recording and takes free text, so a visitor can ask
 * something nobody recorded. It renders here because it is the same shape as a
 * failure to a reader, being the region where an answer would have been.
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
  unrecorded: {
    headline: 'This page holds a recording, and your description is not in it.',
    next: 'Edit the description and pick one of the recorded questions, or run the system locally to ask your own.',
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

  // `unrecorded` takes the neutral treatment rather than the error one. Four of
  // these five are something going wrong and this one is the deployment working
  // as built, so painting it in the error role would report a fault where there
  // is none, the way a refusal would if it took this region at all.
  const broken = state !== 'unrecorded'

  return (
    <div
      role="alert"
      className={`my-6 rounded-lg px-[17px] py-[15px] ${
        broken
          ? 'border border-error/30 bg-error-surface'
          : 'border border-rule bg-surface'
      }`}
    >
      <b
        className={`mb-[3px] block text-[14px] ${broken ? 'text-error' : 'text-ink'}`}
      >
        {copy.headline}
      </b>
      <p
        className={`m-0 text-[13px] leading-[1.5] ${broken ? 'text-error' : 'text-muted'}`}
      >
        {copy.next}
      </p>
      {/* Absent on `unreachable`: nothing answered, so nothing logged one. */}
      {correlationId && state !== 'unreachable' && (
        <span className="mt-2 block font-mono text-[11px] text-muted">
          correlation {correlationId}
        </span>
      )}
    </div>
  )
}
