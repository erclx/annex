import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { WalkChips, type WalkShape } from '@/components/answer/walk-chips'

function aWalk(overrides: Partial<WalkShape> = {}): WalkShape {
  return {
    searched_ids: ['art_50.1', 'art_3'],
    traversed_ids: ['art_50', 'art_52', 'art_2', 'art_4'],
    edges: [
      { source_id: 'art_50.1', target_id: 'art_50', hop: 0 },
      { source_id: 'art_50', target_id: 'art_52', hop: 1 },
      { source_id: 'art_3', target_id: 'art_2', hop: 1 },
      { source_id: 'art_52', target_id: 'art_4', hop: 2 },
    ],
    dropped_ids: ['art_4'],
    ...overrides,
  }
}

function chip(name: string | RegExp) {
  return screen.getByRole('button', { name })
}

describe('WalkChips', () => {
  it('names the columns in the words the finished walk uses', () => {
    render(<WalkChips walk={aWalk()} version="consolidated" />)

    expect(screen.getByText('Found by search')).toBeInTheDocument()
    expect(screen.getByText('Their article')).toBeInTheDocument()
    expect(screen.getByText('Cited from there')).toBeInTheDocument()
  })

  it('opens a provision in the Act from its chip', async () => {
    const onOpen = vi.fn()
    render(<WalkChips walk={aWalk()} version="consolidated" onOpen={onOpen} />)

    await userEvent.click(chip(/^Article 52/))

    expect(onOpen).toHaveBeenCalledWith('art_52')
  })

  it('heads a group reached a hop further with the provision that reached it', () => {
    render(<WalkChips walk={aWalk()} version="consolidated" />)

    const group = screen.getByRole('group', { name: 'Cited from Article 52' })
    expect(
      within(group).getByRole('button', { name: /^Article 4/ }),
    ).toBeVisible()
  })

  it('names a provision the budget set aside as set aside', () => {
    render(<WalkChips walk={aWalk()} version="consolidated" />)

    expect(chip('Article 4, set aside to fit the prompt')).toBeInTheDocument()
    expect(chip('Article 52')).toBeInTheDocument()
  })

  it('sets nothing aside before the budget has run', () => {
    render(
      <WalkChips walk={aWalk({ dropped_ids: null })} version="consolidated" />,
    )

    expect(chip('Article 4')).toBeInTheDocument()
  })

  it('traces the path that reached a provision when its chip takes focus', () => {
    render(<WalkChips walk={aWalk()} version="consolidated" />)

    fireEvent.focus(chip(/^Article 4/))

    expect(chip('Article 52')).toHaveAttribute('data-traced', 'true')
    expect(chip('Article 50')).toHaveAttribute('data-traced', 'true')
    expect(chip('Article 50(1)')).toHaveAttribute('data-traced', 'true')
    expect(chip('Article 2')).not.toHaveAttribute('data-traced')
  })

  it('shows only as many provisions as have been revealed', () => {
    render(<WalkChips walk={aWalk()} version="consolidated" revealed={3} />)

    expect(screen.getAllByRole('button')).toHaveLength(3)
  })

  it('sums the walk up from its own counts', () => {
    render(<WalkChips walk={aWalk()} version="consolidated" summarized />)

    expect(
      screen.getByText(
        'Search found 2 provisions. The walk lifted 1 of them to its whole article and followed references to 3 more. Of the 6 reached, 1 was set aside to fit the prompt, shown dashed, and never read.',
      ),
    ).toBeInTheDocument()
  })

  it('keeps search alone when the walk took no edges', () => {
    render(
      <WalkChips
        walk={aWalk({ traversed_ids: [], edges: [], dropped_ids: [] })}
        version="consolidated"
      />,
    )

    expect(screen.getByText('Found by search')).toBeInTheDocument()
    expect(screen.queryByText('Their article')).not.toBeInTheDocument()
    expect(screen.getAllByRole('button')).toHaveLength(2)
  })
})
