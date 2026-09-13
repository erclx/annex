/**
 * What the wait knows about a run so far, folded from its stream frames.
 *
 * One value the step list, the growing walk and the reading card all read, so
 * the three never disagree about which step is running or what was reached.
 * Every timestamp is the moment a frame arrived rather than one the service
 * reported, so a step's time is what the reader actually waited.
 *
 * Drafting is one step over two nodes. The budget cut lands within
 * milliseconds of the walk and the model call runs from there, so a reader
 * sees one step whose result appears partway through, which is when the
 * reading card can say what is being read.
 */
import type { StreamNode } from '@/lib/stream'

export type StepKey = 'route' | 'retrieve' | 'traverse' | 'draft'
export type StepState = 'pending' | 'running' | 'done'

type Edge = NonNullable<StreamNode['edges']>[number]

export interface WalkProgress {
  startedAt: number
  finishedAt: Partial<Record<StepKey, number>>
  searchedIds: string[] | null
  traversedIds: string[] | null
  edges: Edge[] | null
  suppliedIds: string[] | null
  droppedIds: string[] | null
  /** When the budget frame arrived, which is when drafting has text to read. */
  suppliedAt: number | null
}

export interface StepStatus {
  step: StepKey
  state: StepState
  /** How long the step ran, or has run so far. Null while it is pending. */
  elapsedMs: number | null
}

const STEPS: StepKey[] = ['route', 'retrieve', 'traverse', 'draft']

/** The node whose frame closes each step. */
const CLOSED_BY: Record<string, StepKey> = {
  route: 'route',
  retrieve: 'retrieve',
  traverse: 'traverse',
  synthesize: 'draft',
}

export function startProgress(atMs: number): WalkProgress {
  return {
    startedAt: atMs,
    finishedAt: {},
    searchedIds: null,
    traversedIds: null,
    edges: null,
    suppliedIds: null,
    droppedIds: null,
    suppliedAt: null,
  }
}

export function advance(
  progress: WalkProgress,
  node: StreamNode,
  atMs: number,
): WalkProgress {
  const closes = CLOSED_BY[node.node]
  return {
    ...progress,
    finishedAt: closes
      ? { ...progress.finishedAt, [closes]: atMs }
      : progress.finishedAt,
    searchedIds: node.searched_ids ?? progress.searchedIds,
    traversedIds: node.traversed_ids ?? progress.traversedIds,
    edges: node.edges ?? progress.edges,
    suppliedIds: node.supplied_ids ?? progress.suppliedIds,
    droppedIds: node.dropped_ids ?? progress.droppedIds,
    suppliedAt: node.supplied_ids ? atMs : progress.suppliedAt,
  }
}

/** Each step's state at `nowMs`, in the order the graph runs them. */
export function stepStates(
  progress: WalkProgress,
  nowMs: number,
): StepStatus[] {
  return STEPS.map((step, index) => {
    const previous = index === 0 ? null : STEPS[index - 1]
    const startedAt =
      previous === null ? progress.startedAt : progress.finishedAt[previous]
    const finishedAt = progress.finishedAt[step]

    if (startedAt === undefined) {
      return { step, state: 'pending', elapsedMs: null }
    }
    if (finishedAt !== undefined) {
      return { step, state: 'done', elapsedMs: finishedAt - startedAt }
    }
    return { step, state: 'running', elapsedMs: nowMs - startedAt }
  })
}
