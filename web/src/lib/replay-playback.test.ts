import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { Answer } from '@/lib/answer'
import {
  PLAYBACK_SPEEDUP,
  playbackSchedule,
  playRecording,
} from '@/lib/replay-playback'

function aRecording(overrides: Partial<Answer> = {}): Answer {
  return {
    question: 'a customer chatbot',
    version: 'consolidated',
    claims: [],
    refusal: null,
    retrieval: {
      searched_ids: ['art_50.1', 'art_3'],
      traversed_ids: ['art_50', 'art_2'],
      dropped_ids: ['art_2'],
      uncited_ids: [],
      edges: [
        { source_id: 'art_50.1', target_id: 'art_50', hop: 0 },
        { source_id: 'art_3', target_id: 'art_2', hop: 1 },
      ],
      traversal_enabled: true,
      truncated: false,
      prompt_tokens: 7940,
      completion_tokens: 288,
      duration_ms: 30_000,
      model: 'annex-qwen3-27b',
    },
    ...overrides,
  }
}

function aRefusal(): Answer {
  return aRecording({
    refusal: {
      reason: 'The Act never defines the threshold.',
      missing: ['what counts as a substantial modification'],
      consulted: [],
    },
  })
}

describe('playbackSchedule', () => {
  it('plays the nodes in the order the graph runs them', () => {
    const nodes = playbackSchedule(aRecording()).map(({ node }) => node.node)

    expect(nodes).toEqual([
      'route',
      'retrieve',
      'traverse',
      'budget',
      'synthesize',
    ])
  })

  it('reaches the refuse node only on a recorded refusal', () => {
    const nodes = playbackSchedule(aRefusal()).map(({ node }) => node.node)

    expect(nodes.at(-1)).toBe('refuse')
  })

  it('spans the recording divided by the speed-up it names', () => {
    const schedule = playbackSchedule(aRecording())

    expect(schedule.at(-1)?.atMs).toBe(30_000 / PLAYBACK_SPEEDUP)
  })

  it('spends the first third restating the question', () => {
    const route = playbackSchedule(aRecording())[0]

    expect(route.atMs).toBe(30_000 / PLAYBACK_SPEEDUP / 3)
  })

  it('carries the recorded walk on the traverse frame', () => {
    const traverse = playbackSchedule(aRecording())[2].node

    expect(traverse.traversed_ids).toEqual(['art_50', 'art_2'])
    expect(traverse.edges).toHaveLength(2)
  })

  it('supplies what the budget kept and names what it dropped', () => {
    const budget = playbackSchedule(aRecording())[3].node

    expect(budget.supplied_ids).toEqual(['art_50.1', 'art_3', 'art_50'])
    expect(budget.dropped_ids).toEqual(['art_2'])
  })
})

describe('playRecording', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('hands every frame over and resolves once the last has played', async () => {
    const onNode = vi.fn()

    const played = playRecording(aRecording(), onNode)
    await vi.runAllTimersAsync()
    await played

    expect(onNode).toHaveBeenCalledTimes(5)
  })

  it('plays nothing further once the signal aborts', async () => {
    const onNode = vi.fn()
    const controller = new AbortController()

    const played = playRecording(aRecording(), onNode, controller.signal)
    await vi.advanceTimersByTimeAsync(30_000 / PLAYBACK_SPEEDUP / 3)
    controller.abort()
    await vi.runAllTimersAsync()
    await played

    expect(onNode.mock.calls.map(([node]) => node.node)).toEqual(['route'])
  })
})
