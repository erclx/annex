import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ActReader } from '@/components/act-reader'

function TriggeredReader() {
  const [openId, setOpenId] = useState<string | null>(null)
  return (
    <>
      <button
        type="button"
        onClick={() => {
          setOpenId('art_6')
        }}
      >
        Article 6
      </button>
      <ActReader
        version="consolidated"
        openId={openId}
        onClose={() => {
          setOpenId(null)
        }}
        onVersionChange={vi.fn()}
      />
    </>
  )
}

describe('ActReader', () => {
  beforeEach(() => {
    Element.prototype.scrollIntoView = vi.fn()
  })

  it('should render nothing when no provision is open', () => {
    render(
      <ActReader
        version="consolidated"
        openId={null}
        onClose={vi.fn()}
        onVersionChange={vi.fn()}
      />,
    )

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('should open to the provision named by its id', () => {
    render(
      <ActReader
        version="consolidated"
        openId="art_6"
        onClose={vi.fn()}
        onVersionChange={vi.fn()}
      />,
    )

    expect(
      screen.getByRole('dialog', { name: 'Article 6' }),
    ).toBeInTheDocument()
  })

  it('should call onClose when the close button is activated', async () => {
    const onClose = vi.fn()
    render(
      <ActReader
        version="consolidated"
        openId="art_6"
        onClose={onClose}
        onVersionChange={vi.fn()}
      />,
    )

    await userEvent.click(screen.getByRole('button', { name: 'Close' }))

    expect(onClose).toHaveBeenCalled()
  })

  it('should call onClose when the backdrop is activated', async () => {
    const onClose = vi.fn()
    render(
      <ActReader
        version="consolidated"
        openId="art_6"
        onClose={onClose}
        onVersionChange={vi.fn()}
      />,
    )

    await userEvent.click(
      screen.getByRole('button', { name: 'Close the reading panel' }),
    )

    expect(onClose).toHaveBeenCalled()
  })

  it('should call onClose on escape', async () => {
    const onClose = vi.fn()
    render(
      <ActReader
        version="consolidated"
        openId="art_6"
        onClose={onClose}
        onVersionChange={vi.fn()}
      />,
    )

    await userEvent.keyboard('{Escape}')

    expect(onClose).toHaveBeenCalled()
  })

  it('should return focus to the trigger on close', async () => {
    render(<TriggeredReader />)
    const trigger = screen.getByRole('button', { name: 'Article 6' })

    trigger.focus()
    await userEvent.click(trigger)
    await userEvent.click(screen.getByRole('button', { name: 'Close' }))

    expect(trigger).toHaveFocus()
  })

  describe('docked beside the answer', () => {
    const cited = [
      { provisionId: 'art_6', label: 'Article 6' },
      { provisionId: 'art_50', label: 'Article 50' },
    ]

    it('should render as a region of the page rather than a dialog', () => {
      render(
        <ActReader
          docked
          version="consolidated"
          openId="art_6"
          cited={cited}
          onClose={vi.fn()}
          onVersionChange={vi.fn()}
        />,
      )

      expect(
        screen.getByRole('complementary', { name: 'The Act' }),
      ).toBeInTheDocument()
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      expect(
        screen.queryByRole('button', { name: 'Close' }),
      ).not.toBeInTheDocument()
    })

    it('should jump to a provision the answer cites', async () => {
      const onOpen = vi.fn()
      render(
        <ActReader
          docked
          version="consolidated"
          openId="art_6"
          cited={cited}
          onOpen={onOpen}
          onClose={vi.fn()}
          onVersionChange={vi.fn()}
        />,
      )

      await userEvent.click(screen.getByRole('button', { name: 'Article 50' }))

      expect(onOpen).toHaveBeenCalledWith('art_50')
    })

    it('should switch to the walk when it is asked for', () => {
      render(
        <ActReader
          docked
          version="consolidated"
          openId="art_6"
          cited={cited}
          walk={<p>the walk drawing</p>}
          view="walk"
          onClose={vi.fn()}
          onVersionChange={vi.fn()}
        />,
      )

      expect(screen.getByText('the walk drawing')).toBeInTheDocument()
      expect(
        screen.getByRole('button', { name: 'The walk' }),
      ).toHaveAttribute('aria-pressed', 'true')
    })
  })

  it('should hand the picked version back to its caller', async () => {
    const onVersionChange = vi.fn()
    render(
      <ActReader
        version="consolidated"
        openId="art_6"
        onClose={vi.fn()}
        onVersionChange={onVersionChange}
      />,
    )

    await userEvent.click(screen.getByRole('button', { name: 'Original' }))

    expect(onVersionChange).toHaveBeenCalledWith('original')
  })
})
