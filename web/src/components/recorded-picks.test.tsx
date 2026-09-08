import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { RecordedPicks } from '@/components/recorded-picks'
import { recordedQuestions } from '@/lib/replay'

/**
 * Rendered rather than reasoned about.
 *
 * The first attempt at this asserted over `recordedQuestions` alone, grouping by
 * unique flow and collecting each group back. That is a permutation of the input
 * by construction, so it passed whatever the component did and would have stayed
 * green through the exact regression it was written to catch. Driving the
 * component is what makes the count mean something.
 */
describe('RecordedPicks', () => {
  it('should render one pick for every recorded question', () => {
    render(<RecordedPicks onPick={vi.fn()} />)

    for (const question of recordedQuestions) {
      expect(
        screen.getByRole('button', { name: question.description }),
      ).toBeInTheDocument()
    }
  })

  it('should render no more picks than the recording holds', () => {
    render(<RecordedPicks onPick={vi.fn()} />)

    expect(screen.getAllByRole('button')).toHaveLength(recordedQuestions.length)
  })

  it('should hand the picked description back to its caller', async () => {
    const onPick = vi.fn()
    render(<RecordedPicks onPick={onPick} />)

    await userEvent.click(
      screen.getByRole('button', { name: recordedQuestions[0].description }),
    )

    expect(onPick).toHaveBeenCalledWith(recordedQuestions[0].description)
  })
})
