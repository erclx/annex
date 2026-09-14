/**
 * Reads `POST /ask/stream`, the same run `/ask` answers, framed as it happens.
 *
 * The service sends one `node` frame as each graph node finishes, carrying the
 * ids that node reached, then one terminal `answer` or `error` frame.
 * `python/src/annex/service/streaming.py` writes them and
 * `canon/context/service.md` records the route.
 *
 * Every frame is parsed strictly against schemas generated from the Python
 * models, the way `ask.ts` parses an answer, so a frame this build cannot read
 * ends the run as `failed` rather than rendering a guess.
 */
import { answerSchema } from '@/lib/service/answer'
import type { AskResult } from '@/lib/service/ask'
import { type StreamError, streamErrorSchema } from '@/lib/service/stream-error'
import { type StreamNode, streamNodeSchema } from '@/lib/service/stream-node'

export type { StreamNode }

const UNREADABLE = 'The service answered with something this build cannot read.'

/**
 * Why a stream that stopped early is `failed` rather than `unreachable`.
 *
 * The service was reached, since frames arrived, and a run that ends with no
 * terminal frame is a run the service did not finish, which is what `failed`
 * tells a reader to quote.
 */
const ENDED_EARLY = 'The service stopped before it finished answering.'

type Frame =
  | { event: 'node'; node: StreamNode }
  | { event: 'answer'; result: AskResult }
  | { event: 'error'; error: StreamError }
  | { event: 'unreadable' }

function readJson(data: string | undefined): { body: unknown } | null {
  if (data === undefined) return null
  try {
    return { body: JSON.parse(data) as unknown }
  } catch {
    return null
  }
}

function parseFrame(block: string): Frame {
  const event = /^event: (.*)$/m.exec(block)?.[1]
  const parsedJson = readJson(/^data: (.*)$/m.exec(block)?.[1])
  if (parsedJson === null) return { event: 'unreadable' }
  const { body } = parsedJson

  if (event === 'node') {
    const parsed = streamNodeSchema.safeParse(body)
    return parsed.success
      ? { event: 'node', node: parsed.data }
      : { event: 'unreadable' }
  }
  if (event === 'answer') {
    const parsed = answerSchema.safeParse(body)
    if (!parsed.success) return { event: 'unreadable' }
    const answer = parsed.data
    return {
      event: 'answer',
      result: answer.refusal
        ? { state: 'refused', answer }
        : { state: 'answered', answer },
    }
  }
  if (event === 'error') {
    const parsed = streamErrorSchema.safeParse(body)
    return parsed.success
      ? { event: 'error', error: parsed.data }
      : { event: 'unreadable' }
  }
  return { event: 'unreadable' }
}

function fromError({ state, detail, correlationId }: StreamError): AskResult {
  if (state === 'invalid') return { state, detail }
  return correlationId === null
    ? { state, detail }
    : { state, detail, correlationId }
}

/**
 * Hands each node frame to `onNode` as it arrives, and resolves on the
 * terminal frame.
 *
 * A read that fails after the stream opened resolves as `failed` unless the
 * signal aborted it, in which case the error is rethrown so the caller can
 * tell its own abort and its timeout apart from a service that broke off.
 */
export async function readStreamedAnswer(
  body: ReadableStream<Uint8Array>,
  onNode: (node: StreamNode) => void,
  signal?: AbortSignal,
): Promise<AskResult> {
  const reader = body.getReader()
  const decoder = new TextDecoder()
  let buffered = ''

  try {
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      buffered += decoder.decode(value, { stream: true })

      let boundary = buffered.indexOf('\n\n')
      while (boundary !== -1) {
        const frame = parseFrame(buffered.slice(0, boundary))
        buffered = buffered.slice(boundary + 2)
        boundary = buffered.indexOf('\n\n')

        if (frame.event === 'node') onNode(frame.node)
        else if (frame.event === 'answer') return frame.result
        else if (frame.event === 'error') return fromError(frame.error)
        else return { state: 'failed', detail: UNREADABLE }
      }
    }
  } catch (error) {
    if (signal?.aborted) throw error
    return { state: 'failed', detail: ENDED_EARLY }
  } finally {
    reader.releaseLock()
  }

  return { state: 'failed', detail: ENDED_EARLY }
}
