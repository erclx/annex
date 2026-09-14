/**
 * Plays a recorded answer's retrieval as the frames a live run would send.
 *
 * The deployed build replays answers the live system already gave, and a
 * recording holds which provisions each step reached but not when. So the ids,
 * the edges and the budget cut here are the recording's, and the timing is
 * invented: the phase shares the first-use agent pass measured on the live
 * stream, about a third restating the question and the rest drafting, with
 * search, the walk and the budget landing within moments of each other, scaled
 * to the recording's own `duration_ms` and played `PLAYBACK_SPEEDUP` times
 * faster. The page says so on the surface, next to the steps it paces.
 *
 * The budget frame's supplied ids are what the recording reached less what it
 * dropped, in arrival order. The live pipeline numbers them in its budget's own
 * sorted order, which a recording does not keep, and every reader of the frame
 * deduplicates and shows them unordered, so nothing on the surface depends on
 * the difference.
 */
import type { Answer } from '@/lib/service/answer'
import type { StreamNode } from '@/lib/service/stream'

/** How many times faster than it was recorded a replay plays. */
export const PLAYBACK_SPEEDUP = 5

/** The gap between search, the walk and the budget, all near-instant live. */
const STEP_GAP_MS = 40

export interface ScheduledFrame {
  atMs: number
  node: StreamNode
}

function frame(
  node: string,
  fields: Partial<Omit<StreamNode, 'node'>> = {},
): StreamNode {
  return {
    node,
    searched_ids: null,
    traversed_ids: null,
    edges: null,
    supplied_ids: null,
    dropped_ids: null,
    ...fields,
  }
}

/** Every frame a recording plays, each with the moment it lands. */
export function playbackSchedule(answer: Answer): ScheduledFrame[] {
  const { retrieval } = answer
  const total = retrieval.duration_ms / PLAYBACK_SPEEDUP
  const routed = total / 3
  const dropped = new Set(retrieval.dropped_ids)
  const reached = [...retrieval.searched_ids, ...retrieval.traversed_ids]

  const schedule: ScheduledFrame[] = [
    { atMs: routed, node: frame('route') },
    {
      atMs: routed + STEP_GAP_MS,
      node: frame('retrieve', { searched_ids: retrieval.searched_ids }),
    },
    {
      atMs: routed + STEP_GAP_MS * 2,
      node: frame('traverse', {
        searched_ids: retrieval.searched_ids,
        traversed_ids: retrieval.traversed_ids,
        edges: retrieval.edges,
      }),
    },
    {
      atMs: routed + STEP_GAP_MS * 3,
      node: frame('budget', {
        supplied_ids: reached.filter((id) => !dropped.has(id)),
        dropped_ids: retrieval.dropped_ids,
      }),
    },
    { atMs: total, node: frame('synthesize') },
  ]
  if (answer.refusal) schedule.push({ atMs: total, node: frame('refuse') })
  return schedule
}

/**
 * Hands each frame over at its moment, and resolves once the last has played
 * or the signal aborts, whichever comes first.
 */
export function playRecording(
  answer: Answer,
  onNode: (node: StreamNode) => void,
  signal?: AbortSignal,
): Promise<void> {
  return new Promise((resolve) => {
    if (signal?.aborted) {
      resolve()
      return
    }
    const schedule = playbackSchedule(answer)
    const timers = schedule.map(({ atMs, node }, index) =>
      setTimeout(() => {
        onNode(node)
        if (index === schedule.length - 1) finish()
      }, atMs),
    )

    function finish() {
      timers.forEach(clearTimeout)
      signal?.removeEventListener('abort', finish)
      resolve()
    }

    signal?.addEventListener('abort', finish)
  })
}
