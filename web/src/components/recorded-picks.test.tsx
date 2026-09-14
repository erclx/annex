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

  it('should introduce the picks as recorded questions to start from', () => {
    render(<RecordedPicks onPick={vi.fn()} />)

    expect(
      screen.getByRole('heading', {
        name: 'Or start from a recorded question',
      }),
    ).toBeInTheDocument()
    expect(
      screen.getByText(
        'Twelve descriptions were put to the live system, on both versions of the Act. A description outside those twelve has no recorded answer here.',
      ),
    ).toBeInTheDocument()
  })

  it('should name a flow in sentence case rather than capitals', () => {
    render(<RecordedPicks onPick={vi.fn()} />)

    expect(
      screen.getByText('Telling a person they are dealing with an AI system'),
    ).not.toHaveClass('uppercase')
  })
})

describe('the outcome line on each card', () => {
  it('should say a question answered on both texts was answered on both', () => {
    render(<RecordedPicks onPick={vi.fn()} />)

    expect(
      screen.getByRole('button', {
        name: 'a chatbot on our website that answers customer questions about our products',
      }),
    ).toHaveAccessibleDescription('Answered on both texts')
  })

  it('should say which text refused a question the two texts split on', () => {
    render(<RecordedPicks onPick={vi.fn()} />)

    expect(
      screen.getByRole('button', {
        name: 'we generate product photographs with an image model and publish them in our online shop',
      }),
    ).toHaveAccessibleDescription(
      'Refused on the original, answered on the amended',
    )
  })

  it('should claim a refusal on both texts only for the questions refused on both', () => {
    render(<RecordedPicks onPick={vi.fn()} />)

    expect(screen.getAllByText('Refused on both texts')).toHaveLength(
      recordedQuestions.filter(
        (question) =>
          question.refused.original && question.refused.consolidated,
      ).length,
    )
  })

  it('should claim an answer on both texts only for the questions answered on both', () => {
    render(<RecordedPicks onPick={vi.fn()} />)

    expect(screen.getAllByText('Answered on both texts')).toHaveLength(
      recordedQuestions.filter(
        (question) =>
          question.refused.original === false &&
          question.refused.consolidated === false,
      ).length,
    )
  })
})
