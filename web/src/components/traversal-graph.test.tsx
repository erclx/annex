import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { TraversalGraph } from '@/components/traversal-graph'
import type { Retrieval } from '@/components/versions'

function makeRetrieval(overrides: Partial<Retrieval> = {}): Retrieval {
  return {
    completion_tokens: 0,
    dropped_ids: [],
    duration_ms: 0,
    edges: [],
    model: '',
    prompt_tokens: 0,
    searched_ids: [],
    traversal_enabled: true,
    traversed_ids: [],
    truncated: false,
    ...overrides,
  }
}

describe('TraversalGraph', () => {
  it('should render nothing for an edgeless trace, so it degrades to the id lists rather than an empty frame', () => {
    const { container } = render(
      <TraversalGraph
        retrieval={makeRetrieval({
          searched_ids: ['art_6'],
          traversed_ids: ['art_8'],
        })}
      />,
    )

    expect(container).toBeEmptyDOMElement()
  })

  it('should draw a dropped provision as a hollow, dashed node rather than omitting it', () => {
    const { container } = render(
      <TraversalGraph
        retrieval={makeRetrieval({
          searched_ids: ['art_6'],
          traversed_ids: ['art_8', 'art_9'],
          dropped_ids: ['art_9'],
          edges: [
            { source_id: 'art_6', target_id: 'art_8', hop: 1 },
            { source_id: 'art_8', target_id: 'art_9', hop: 2 },
          ],
        })}
      />,
    )

    const dropped = container.querySelector('circle[stroke-dasharray]')
    expect(dropped).not.toBeNull()
    expect(dropped?.getAttribute('fill')).toBe('none')
  })

  it('should draw one edge for every edge the trace carries', () => {
    const { container } = render(
      <TraversalGraph
        retrieval={makeRetrieval({
          searched_ids: ['art_6'],
          traversed_ids: ['art_8', 'art_9'],
          edges: [
            { source_id: 'art_6', target_id: 'art_8', hop: 1 },
            { source_id: 'art_8', target_id: 'art_9', hop: 2 },
          ],
        })}
      />,
    )

    expect(container.querySelectorAll('path')).toHaveLength(2)
  })

  it('should place a searched provision and a traversed one in different columns', () => {
    const { container } = render(
      <TraversalGraph
        retrieval={makeRetrieval({
          searched_ids: ['art_6'],
          traversed_ids: ['art_8'],
          edges: [{ source_id: 'art_6', target_id: 'art_8', hop: 1 }],
        })}
      />,
    )

    const nodes = [...container.querySelectorAll('g')]
    const xs = nodes.map(
      (node) =>
        node.getAttribute('transform')?.match(/translate\(([\d.-]+),/)?.[1],
    )

    expect(new Set(xs).size).toBe(2)
  })

  it('should report only the hops actually reached in its accessible label', () => {
    const { getByRole } = render(
      <TraversalGraph
        retrieval={makeRetrieval({
          searched_ids: ['art_6'],
          traversed_ids: ['art_8'],
          edges: [{ source_id: 'art_6', target_id: 'art_8', hop: 1 }],
        })}
      />,
    )

    expect(getByRole('img', { name: /over 2 hops/ })).toBeInTheDocument()
  })

  it('should render a column label for every hop present', () => {
    const { getByText } = render(
      <TraversalGraph
        retrieval={makeRetrieval({
          searched_ids: ['art_6'],
          traversed_ids: ['art_8', 'art_10'],
          edges: [
            { source_id: 'art_6', target_id: 'art_8', hop: 1 },
            { source_id: 'art_8', target_id: 'art_10', hop: 2 },
          ],
        })}
      />,
    )

    expect(getByText('searched')).toBeInTheDocument()
    expect(getByText('hop 1')).toBeInTheDocument()
    expect(getByText('hop 2')).toBeInTheDocument()
  })
})
