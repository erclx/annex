import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { ReplayNotice } from '@/components/replay-notice'

function stubViewport(isWide: boolean) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({
      matches: isWide && query === '(min-width: 1024px)',
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  )
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('ReplayNotice', () => {
  it('should state the whole recording notice at 1024 pixels and wider', () => {
    stubViewport(true)

    render(<ReplayNotice />)

    expect(
      screen.getByText(
        'This page replays a recording. Nothing here is asking a model.',
      ),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Details' }),
    ).not.toBeInTheDocument()
  })

  it('should shorten to one line below 1024 pixels', () => {
    stubViewport(false)

    render(<ReplayNotice />)

    expect(
      screen.getByText('A recording, not a live model.'),
    ).toBeInTheDocument()
    expect(
      screen.queryByText(/came back from the live system on/),
    ).not.toBeInTheDocument()
  })

  it('should open the rest of the notice from its details control', async () => {
    stubViewport(false)
    render(<ReplayNotice />)

    await userEvent.click(screen.getByRole('button', { name: 'Details' }))

    expect(
      screen.getByText(/came back from the live system on/),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Details' })).toHaveAttribute(
      'aria-expanded',
      'true',
    )
  })
})
