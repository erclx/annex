import { act, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { CARD_DELAY_MS, REVEAL_MS, WaitPane } from '@/components/wait-pane'
import type { StreamNode } from '@/lib/stream'
import { advance, startProgress, type WalkProgress } from '@/lib/walk-progress'

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

function walked(): WalkProgress {
  return advance(
    advance(
      advance(startProgress(0), aFrame('route'), 10),
      aFrame('retrieve', { searched_ids: ['art_50.1', 'art_3'] }),
      20,
    ),
    aFrame('traverse', {
      searched_ids: ['art_50.1', 'art_3'],
      traversed_ids: ['art_50', 'art_2'],
      edges: [
        { source_id: 'art_50.1', target_id: 'art_50', hop: 0 },
        { source_id: 'art_3', target_id: 'art_2', hop: 1 },
      ],
    }),
    30,
  )
}

function budgeted(): WalkProgress {
  return advance(
    walked(),
    aFrame('budget', {
      supplied_ids: ['art_50.1', 'art_3', 'art_50'],
      dropped_ids: ['art_2'],
    }),
    40,
  )
}

afterEach(() => {
  vi.useRealTimers()
})

describe('WaitPane', () => {
  it('says it is waiting on search before anything is reached', () => {
    render(<WaitPane progress={startProgress(0)} version="consolidated" />)

    expect(screen.getByText('Waiting for search to return.')).toBeVisible()
  })

  it('grows the walk until every provision it reached is shown', () => {
    vi.useFakeTimers()
    render(<WaitPane progress={walked()} version="consolidated" />)

    act(() => {
      vi.advanceTimersByTime(REVEAL_MS)
    })

    expect(screen.getAllByRole('button')).toHaveLength(4)
    expect(screen.getByText('2 searched · 2 traversed')).toBeInTheDocument()
  })

  it('turns to what the model is reading once drafting has had a moment', () => {
    vi.useFakeTimers()
    const { rerender } = render(
      <WaitPane progress={walked()} version="consolidated" />,
    )
    rerender(<WaitPane progress={budgeted()} version="consolidated" />)

    act(() => {
      vi.advanceTimersByTime(CARD_DELAY_MS)
    })

    expect(
      screen.getByRole('heading', { name: 'What the model is reading' }),
    ).toBeVisible()
    expect(
      screen.getByText('The walk: 2 found by search, 2 reached, 1 set aside'),
    ).toBeVisible()
    expect(
      screen.getByText('Being read by the model · 1 of 3 supplied'),
    ).toBeVisible()
  })
})
