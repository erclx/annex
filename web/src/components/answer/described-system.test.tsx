import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { DescribedSystem } from '@/components/answer/described-system'

const LONG_DESCRIPTION =
  'a voice agent that phones our customers to confirm appointments, speaking in a synthesized voice, and which also books follow-up visits, reschedules missed ones, and passes a transcript of every call to the clinic that asked for it'

function renderCard(
  overrides: Partial<Parameters<typeof DescribedSystem>[0]> = {},
) {
  render(
    <DescribedSystem
      description={LONG_DESCRIPTION}
      onEdit={vi.fn()}
      version="consolidated"
      onVersionChange={vi.fn()}
      pending={false}
      {...overrides}
    />,
  )
}

describe('DescribedSystem', () => {
  it('should render the description whole', () => {
    renderCard()

    expect(screen.getByText(LONG_DESCRIPTION)).toBeInTheDocument()
  })

  it('should hand an edit back to its caller', async () => {
    const onEdit = vi.fn()
    renderCard({ onEdit })

    await userEvent.click(
      screen.getByRole('button', { name: 'Edit description' }),
    )

    expect(onEdit).toHaveBeenCalled()
  })

  it('should say which text the answer was asked against', () => {
    renderCard()

    expect(screen.getByText('Answered against')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Amended 27 Jul 2026' }),
    ).toHaveAttribute('aria-pressed', 'true')
  })

  it('should re-ask against the other text when the toggle changes', async () => {
    const onVersionChange = vi.fn()
    renderCard({ onVersionChange })

    await userEvent.click(screen.getByRole('button', { name: 'Original' }))

    expect(onVersionChange).toHaveBeenCalledWith('original')
  })

  it('should hold the toggle inactive while an ask is pending', () => {
    renderCard({ pending: true })

    expect(screen.getByRole('button', { name: 'Original' })).toBeDisabled()
  })
})
