/**
 * The one place the browser talks to the service.
 *
 * Everything above this module reads `AskResult` and never `fetch`, which is
 * what makes the deployed build's swap to captured fixtures a change to this
 * file rather than to the surface. Seven of the eight results are the published
 * state table, five of them failures, and each names a different next action.
 *
 * The eighth is `unrecorded`, and it belongs to the deployed build alone. That
 * build replays a recording and the input is free text, so a visitor can type
 * something the recording does not hold. `src/lib/replay.ts` carries why the
 * answer to that is a state of its own rather than the nearest fixture.
 *
 * The response body is parsed rather than cast. `answerSchema` is generated
 * from the Python models and emitted strict, so a field the service added and
 * the web build has not seen fails here, at the boundary, with a correlation
 * id beside it. `.claude/context/development.md` carries what that strictness
 * costs, which is that the web build deploys first or the two deploy together.
 */
import { z } from 'zod'

import { type Answer, answerSchema } from '@/lib/answer'
import { replay, REPLAY_MODE } from '@/lib/replay'

export const ASK_TIMEOUT_MS = 300_000

/**
 * Above the service's own budget on purpose.
 *
 * The service bounds the model call at 120 seconds per call and an ask makes
 * two, so its worst case is 240. Aborting at 300 leaves the server's named 504
 * time to arrive, which is the difference between a reader told to narrow the
 * description and a reader told nothing at all.
 */

const serviceErrorSchema = z
  .object({
    state: z.enum(['invalid', 'unavailable', 'timeout', 'failed']),
    detail: z.string(),
    correlationId: z.string().optional(),
  })
  .strict()

export type AskResult =
  | { state: 'answered'; answer: Answer }
  | { state: 'refused'; answer: Answer }
  | { state: 'invalid'; detail: string }
  | { state: 'unavailable'; detail: string; correlationId?: string }
  | { state: 'timeout'; detail: string; correlationId?: string }
  | { state: 'failed'; detail: string; correlationId?: string }
  | { state: 'unreachable' }
  | { state: 'unrecorded' }

export type AskState = AskResult['state']

export interface AskOptions {
  version?: 'original' | 'consolidated'
  traversal?: boolean
  signal?: AbortSignal
}

function baseUrl(): string {
  return process.env.NEXT_PUBLIC_ANNEX_API_URL ?? 'http://localhost:4200'
}

/**
 * A body that did not parse is `failed` rather than a state of its own.
 *
 * A service answering something this build cannot read is a service and a
 * build that disagree about the contract, which is the same fact as an
 * unexpected server error from the reader's side: quote the id and the log
 * answers.
 */
const UNREADABLE = 'The service answered with something this build cannot read.'

function readFailure(body: unknown): AskResult {
  const parsed = serviceErrorSchema.safeParse(body)
  if (!parsed.success) return { state: 'failed', detail: UNREADABLE }

  const { state, detail, correlationId } = parsed.data
  if (state === 'invalid') return { state, detail }
  return { state, detail, correlationId }
}

export async function ask(
  description: string,
  options: AskOptions = {},
): Promise<AskResult> {
  // The deployed build has no service to reach, so it answers from the
  // recording instead. Every caller above this line is unchanged either way,
  // which is the property this module was split out to hold.
  if (REPLAY_MODE) return replay(description, options)

  const controller = new AbortController()
  const timer = setTimeout(() => {
    controller.abort()
  }, ASK_TIMEOUT_MS)
  const abortFromCaller = () => {
    controller.abort()
  }
  options.signal?.addEventListener('abort', abortFromCaller)

  try {
    const response = await fetch(`${baseUrl()}/ask`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        description,
        version: options.version ?? 'consolidated',
        traversal: options.traversal ?? true,
      }),
      signal: controller.signal,
    })

    const body: unknown = await response.json().catch(() => null)
    if (!response.ok) return readFailure(body)

    const parsed = answerSchema.safeParse(body)
    if (!parsed.success) return { state: 'failed', detail: UNREADABLE }

    const answer = parsed.data
    return answer.refusal
      ? { state: 'refused', answer }
      : { state: 'answered', answer }
  } catch {
    /**
     * An abort and a refused connection both land here and mean different
     * things. The signal says which: the browser aborted because the budget
     * ran out, or nothing was listening in the first place.
     */
    return controller.signal.aborted
      ? {
          state: 'timeout',
          detail: 'The model did not answer inside the budget.',
        }
      : { state: 'unreachable' }
  } finally {
    clearTimeout(timer)
    options.signal?.removeEventListener('abort', abortFromCaller)
  }
}
