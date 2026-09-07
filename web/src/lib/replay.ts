/**
 * The recording, and the only module that knows fixtures exist.
 *
 * A deployed build has no service to call. The model this project runs holds
 * 30 GB of a card, so nothing hosted answers these questions and the page a
 * visitor reaches replays answers the live system already gave. Everything
 * above `ask` reads the same `AskResult` union either way, which is what keeps
 * the swap inside these two files.
 *
 * A fixture is parsed rather than cast, exactly as a service response is.
 * `answerSchema` is generated strict from the Python models, so a field added
 * to those models and not re-captured fails here rather than rendering as a
 * gap. `replay.test.ts` runs that parse over every committed fixture, which is
 * what stops such a fixture reaching a build at all.
 *
 * What replay cannot reproduce is the traversal switch. The capture ran with
 * reference following on, so both arms would return one answer here and the
 * control would lie. `src/app/page.tsx` holds it inactive in this mode and the
 * recorded walkthrough shows the comparison against the live system instead.
 */
import { captures, manifest } from '@/fixtures'
import { answerSchema } from '@/lib/answer'
import type { AskOptions, AskResult } from '@/lib/ask'

export const REPLAY_MODE = process.env.NEXT_PUBLIC_ANNEX_MODE === 'replay'

/**
 * One question the recording holds, offered as a pick on the empty state.
 *
 * Both versions of a question carry the same description, so the picks are
 * distinct descriptions rather than distinct entries. Picking one and then
 * moving the version toggle is the version comparison, which is the whole
 * reason both were captured.
 */
export interface RecordedQuestion {
  id: string
  description: string
  flow: string
}

export const capturedOn = manifest.captured_at
export const capturedFrom = manifest.commit

function normalize(description: string): string {
  return description.trim().replace(/\s+/g, ' ').toLowerCase()
}

const byDescription = new Map(
  manifest.entries.map((entry) => [
    `${normalize(entry.description)}|${entry.version}`,
    entry,
  ]),
)

export const recordedQuestions: RecordedQuestion[] = manifest.entries
  .filter(
    (entry, index) =>
      manifest.entries.findIndex(
        (other) => other.question_id === entry.question_id,
      ) === index,
  )
  .map((entry) => ({
    id: entry.question_id,
    description: entry.description,
    flow: entry.flow,
  }))

/**
 * A recorded answer, or the state saying this deployment does not hold one.
 *
 * Matching is exact on a normalized description rather than nearest-neighbour
 * on purpose. The nearest fixture to an unrecorded question is an answer a
 * model produced for a different one, and presenting it would be the invention
 * this whole row exists to retire.
 */
export function replay(
  description: string,
  options: AskOptions = {},
): AskResult {
  const version = options.version ?? 'consolidated'
  const entry = byDescription.get(`${normalize(description)}|${version}`)
  if (!entry) return { state: 'unrecorded' }

  const parsed = answerSchema.safeParse(
    captures[`${entry.question_id}.${version}`],
  )
  if (!parsed.success) {
    return {
      state: 'failed',
      detail: 'A recorded answer no longer matches the shape this build reads.',
    }
  }

  const answer = parsed.data
  return answer.refusal
    ? { state: 'refused', answer }
    : { state: 'answered', answer }
}
