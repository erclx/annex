import { render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { AgentSteps } from '@/components/status/agent-steps'
import type { StreamNode } from '@/lib/service/stream'
import {
  advance,
  startProgress,
  type WalkProgress,
} from '@/lib/service/walk-progress'

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

const SEARCHED = ['art_50.1', 'art_50.2', 'art_50.3', 'art_13.1', 'art_2.10']

function throughSearch(): WalkProgress {
  return advance(
    advance(startProgress(0), aFrame('route'), 13_100),
    aFrame('retrieve', { searched_ids: SEARCHED }),
    13_140,
  )
}

function throughWalk(
  traversed = ['art_50', 'art_13', 'art_52'],
  edges = [
    { source_id: 'art_50.1', target_id: 'art_50', hop: 0 },
    { source_id: 'art_13.1', target_id: 'art_13', hop: 0 },
    { source_id: 'art_50', target_id: 'art_52', hop: 1 },
  ],
): WalkProgress {
  return advance(
    throughSearch(),
    aFrame('traverse', {
      searched_ids: SEARCHED,
      traversed_ids: traversed,
      edges,
    }),
    13_180,
  )
}

function stepNamed(name: RegExp) {
  return screen.getByText(name).closest('li') as HTMLElement
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(16_500)
})

afterEach(() => {
  vi.useRealTimers()
})

describe('AgentSteps', () => {
  it('marks the running step as current and holds the later ones pending', () => {
    render(<AgentSteps progress={startProgress(0)} version="consolidated" />)

    expect(stepNamed(/^Restating your description/)).toHaveAttribute(
      'aria-current',
      'step',
    )
    expect(stepNamed(/^Following the Act/)).not.toHaveAttribute('aria-current')
  })

  it('names the text being searched', () => {
    render(<AgentSteps progress={startProgress(0)} version="original" />)

    expect(
      screen.getByText('Searching the original text by meaning'),
    ).toBeInTheDocument()
  })

  it('names the first three provisions search matched and counts the rest', () => {
    render(<AgentSteps progress={throughSearch()} version="consolidated" />)

    expect(
      within(stepNamed(/^Searching/)).getByText(
        '5 provisions matched: Article 50(1), Article 50(2), Article 50(3) and 2 more',
      ),
    ).toBeInTheDocument()
  })

  it('reports how far the walk reached and how it got there', () => {
    render(<AgentSteps progress={throughWalk()} version="consolidated" />)

    expect(
      within(stepNamed(/^Following the Act/)).getByText(
        '3 provisions reached in 2 hops, 2 lifted to their article and 1 cited from there',
      ),
    ).toBeInTheDocument()
  })

  it('says nothing was reached beyond search when the walk is empty', () => {
    render(<AgentSteps progress={throughWalk([], [])} version="consolidated" />)

    expect(
      screen.getByText('Nothing reached beyond what search matched'),
    ).toBeInTheDocument()
  })

  it('names how many found provisions the budget set aside while drafting runs', () => {
    const progress = advance(
      throughWalk(),
      aFrame('budget', {
        supplied_ids: ['art_50.1', 'art_50.2', 'art_50.3', 'art_13.1'],
        dropped_ids: ['art_2.10', 'art_50', 'art_13', 'art_52'],
      }),
      13_200,
    )

    render(<AgentSteps progress={progress} version="consolidated" />)

    expect(stepNamed(/^Drafting/)).toHaveAttribute('aria-current', 'step')
    expect(
      screen.getByText(
        '4 of the 8 provisions found set aside to fit the prompt budget',
      ),
    ).toBeInTheDocument()
  })

  it('shows the time each finished step took', () => {
    render(<AgentSteps progress={throughSearch()} version="consolidated" />)

    expect(within(stepNamed(/^Restating/)).getByText('13.1 s')).toBeVisible()
    expect(within(stepNamed(/^Searching/)).getByText('40 ms')).toBeVisible()
  })
})
