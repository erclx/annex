import { act, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { CYCLE_MS, ReadingCard } from '@/components/answer/reading-card'
import { findProvision } from '@/lib/corpus/corpus'

afterEach(() => {
  vi.useRealTimers()
})

describe('ReadingCard', () => {
  it('captions what it shows as being read, never as cited', () => {
    render(
      <ReadingCard
        suppliedIds={['art_50.1', 'art_50']}
        version="consolidated"
      />,
    )

    expect(
      screen.getByText('Being read by the model · 1 of 2 supplied'),
    ).toBeInTheDocument()
    expect(screen.queryByText(/cited/i)).not.toBeInTheDocument()
  })

  it('counts a provision the prompt numbered twice once', () => {
    render(
      <ReadingCard
        suppliedIds={['art_50.1', 'art_50', 'art_50.1']}
        version="consolidated"
      />,
    )

    expect(
      screen.getByText('Being read by the model · 1 of 2 supplied'),
    ).toBeInTheDocument()
  })

  it('quotes the supplied provision from the text the page ships', () => {
    const text = findProvision('consolidated', 'art_50.1')?.text ?? ''

    render(<ReadingCard suppliedIds={['art_50.1']} version="consolidated" />)

    expect(
      screen.getByRole('heading', { name: 'Article 50(1)' }),
    ).toBeInTheDocument()
    expect(screen.getByText(text.slice(0, 40), { exact: false })).toBeVisible()
  })

  it('moves to the next supplied provision once a cycle has passed', () => {
    vi.useFakeTimers()
    render(
      <ReadingCard
        suppliedIds={['art_50.1', 'art_50']}
        version="consolidated"
      />,
    )

    act(() => {
      vi.advanceTimersByTime(CYCLE_MS)
    })

    expect(screen.getByRole('heading', { name: 'Article 50' })).toBeVisible()
    expect(
      screen.getByText('Being read by the model · 2 of 2 supplied'),
    ).toBeInTheDocument()
  })

  it('returns to the first after the last', () => {
    vi.useFakeTimers()
    render(
      <ReadingCard
        suppliedIds={['art_50.1', 'art_50']}
        version="consolidated"
      />,
    )

    act(() => {
      vi.advanceTimersByTime(CYCLE_MS * 2)
    })

    expect(
      screen.getByRole('heading', { name: 'Article 50(1)' }),
    ).toBeInTheDocument()
  })
})
