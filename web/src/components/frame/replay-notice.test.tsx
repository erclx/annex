import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { ReplayNotice } from '@/components/frame/replay-notice'

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

    render(<ReplayNotice capturedOn="2026-09-13" specific />)

    expect(
      screen.getByText('You are looking at a recording.'),
    ).toBeInTheDocument()
    expect(
      screen.getByText('Nothing on this page calls a model.'),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Details' }),
    ).not.toBeInTheDocument()
  })

  it('should shorten to one sentence below 1024 pixels', () => {
    stubViewport(false)

    render(<ReplayNotice capturedOn="2026-09-13" specific />)

    expect(
      screen.getByText('You are looking at a recording.'),
    ).toBeInTheDocument()
    expect(
      screen.queryByText('Nothing on this page calls a model.'),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByText(/was captured from the live system on/),
    ).not.toBeInTheDocument()
  })

  it('should open the rest of the notice from its details control', async () => {
    stubViewport(false)
    render(<ReplayNotice capturedOn="2026-09-13" specific />)

    await userEvent.click(screen.getByRole('button', { name: 'Details' }))

    expect(
      screen.getByText('Nothing on this page calls a model.'),
    ).toBeInTheDocument()
    expect(
      screen.getByText(
        'This answer was captured from the live system on 2026-09-13.',
      ),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Details' })).toHaveAttribute(
      'aria-expanded',
      'true',
    )
  })

  it('should word the specific case as naming one answer rather than the whole set', async () => {
    stubViewport(false)
    render(<ReplayNotice capturedOn="2026-09-14" specific />)

    await userEvent.click(screen.getByRole('button', { name: 'Details' }))

    expect(
      screen.queryByText(/^Every answer was captured/),
    ).not.toBeInTheDocument()
  })

  it('should word the generic case as covering the set rather than one answer', async () => {
    stubViewport(false)
    render(<ReplayNotice capturedOn="2026-09-14" specific={false} />)

    await userEvent.click(screen.getByRole('button', { name: 'Details' }))

    expect(
      screen.getByText(
        'Every answer was captured from the live system, most recently on 2026-09-14.',
      ),
    ).toBeInTheDocument()
  })

  it('should render no commit hash in any state', () => {
    stubViewport(true)

    render(<ReplayNotice capturedOn="2026-09-13" specific />)

    expect(screen.queryByText(/^[0-9a-f]{7}$/)).not.toBeInTheDocument()
  })
})
