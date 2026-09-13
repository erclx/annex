import { describe, expect, it } from 'vitest'

import type { StreamNode } from '@/lib/stream'
import { advance, startProgress, stepStates } from '@/lib/walk-progress'

function aFrame(
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

/** A run that has restated, searched and walked, as the live stream sends it. */
function walked() {
  let progress = startProgress(1_000)
  progress = advance(progress, aFrame('route'), 14_000)
  progress = advance(
    progress,
    aFrame('retrieve', { searched_ids: ['art_50.1', 'art_3'] }),
    14_020,
  )
  progress = advance(
    progress,
    aFrame('traverse', {
      searched_ids: ['art_50.1', 'art_3'],
      traversed_ids: ['art_50', 'art_2'],
      edges: [
        { source_id: 'art_50.1', target_id: 'art_50', hop: 0 },
        { source_id: 'art_3', target_id: 'art_2', hop: 1 },
      ],
    }),
    14_040,
  )
  return progress
}

describe('before any frame arrives', () => {
  it('runs the restating step and holds the rest pending', () => {
    const states = stepStates(startProgress(1_000), 4_000)

    expect(states.map(({ step, state }) => [step, state])).toEqual([
      ['route', 'running'],
      ['retrieve', 'pending'],
      ['traverse', 'pending'],
      ['draft', 'pending'],
    ])
    expect(states[0].elapsedMs).toBe(3_000)
  })
})

describe('as frames arrive', () => {
  it('closes restating with the time it took and starts the search', () => {
    const progress = advance(startProgress(1_000), aFrame('route'), 14_000)

    const [route, retrieve] = stepStates(progress, 14_010)

    expect(route).toMatchObject({ state: 'done', elapsedMs: 13_000 })
    expect(retrieve).toMatchObject({ state: 'running', elapsedMs: 10 })
  })

  it('records what search matched on the retrieve frame', () => {
    const progress = advance(
      advance(startProgress(0), aFrame('route'), 10),
      aFrame('retrieve', { searched_ids: ['art_50.1'] }),
      20,
    )

    expect(progress.searchedIds).toEqual(['art_50.1'])
  })

  it('records what the walk reached and how on the traverse frame', () => {
    const progress = walked()

    expect(progress.traversedIds).toEqual(['art_50', 'art_2'])
    expect(progress.edges).toHaveLength(2)
  })

  it('runs drafting from the end of the walk', () => {
    const draft = stepStates(walked(), 20_040)[3]

    expect(draft).toMatchObject({ state: 'running', elapsedMs: 6_000 })
  })

  it('knows what the budget kept and cut while drafting still runs', () => {
    const progress = advance(
      walked(),
      aFrame('budget', {
        supplied_ids: ['art_50.1', 'art_3', 'art_50'],
        dropped_ids: ['art_2'],
      }),
      14_060,
    )

    expect(progress.suppliedIds).toEqual(['art_50.1', 'art_3', 'art_50'])
    expect(progress.droppedIds).toEqual(['art_2'])
    expect(stepStates(progress, 15_000)[3].state).toBe('running')
  })

  it('closes drafting when synthesis finishes', () => {
    const progress = advance(walked(), aFrame('synthesize'), 42_040)

    expect(stepStates(progress, 50_000)[3]).toMatchObject({
      state: 'done',
      elapsedMs: 28_000,
    })
  })
})
