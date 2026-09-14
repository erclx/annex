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

  it('should name the overlay after the point it landed on', () => {
    render(
      <ActReader
        version="original"
        openId="art_3"
        openPoint="1"
        onClose={vi.fn()}
        onVersionChange={vi.fn()}
      />,
    )

    expect(
      screen.getByRole('dialog', { name: 'Article 3, point (1)' }),
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

    it('should name the section in view and its place in the whole Act', () => {
      render(
        <ActReader
          docked
          version="consolidated"
          openId="art_50.6"
          cited={cited}
          onClose={vi.fn()}
          onVersionChange={vi.fn()}
        />,
      )

      expect(screen.getByText('51 of 133')).toBeInTheDocument()
    })

    it('should open the next section a step names', async () => {
      const onOpen = vi.fn()
      render(
        <ActReader
          docked
          version="consolidated"
          openId="art_50.6"
          cited={cited}
          onOpen={onOpen}
          onClose={vi.fn()}
          onVersionChange={vi.fn()}
        />,
      )

      await userEvent.click(
        screen.getByRole('button', { name: 'Next section' }),
      )

      expect(onOpen).toHaveBeenCalledWith('art_51')
    })

    it('should step to the next section on the right arrow while the text has focus', async () => {
      const onOpen = vi.fn()
      render(
        <ActReader
          docked
          version="consolidated"
          openId="art_50.6"
          cited={cited}
          onOpen={onOpen}
          onClose={vi.fn()}
          onVersionChange={vi.fn()}
        />,
      )

      screen.getByRole('region', { name: 'Text of the Act' }).focus()
      await userEvent.keyboard('{ArrowRight}')

      expect(onOpen).toHaveBeenCalledWith('art_51')
    })

    it('should step through cited provisions once switched to them', async () => {
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

      await userEvent.click(screen.getByRole('button', { name: 'Cited' }))
      await userEvent.click(
        screen.getByRole('button', { name: 'Next cited provision' }),
      )

      expect(onOpen).toHaveBeenCalledWith('art_50')
    })

    it('should land on the point an excerpt opened on and mark it', () => {
      render(
        <ActReader
          docked
          version="original"
          openId="anx_III"
          openPoint="4.a"
          cited={[{ provisionId: 'anx_III', label: 'Annex III' }]}
          onClose={vi.fn()}
          onVersionChange={vi.fn()}
        />,
      )

      expect(
        screen
          .getByText(
            /^\(a\) AI systems intended to be used for the recruitment/,
          )
          .closest('[aria-current="location"]'),
      ).not.toBeNull()
    })

    it('should render each definition as a block of its own', () => {
      render(
        <ActReader
          docked
          version="original"
          openId="art_3"
          cited={[{ provisionId: 'art_3', label: 'Article 3' }]}
          onClose={vi.fn()}
          onVersionChange={vi.fn()}
        />,
      )

      expect(
        screen.getByText(/^\(12\) ‘intended purpose’ means/),
      ).toBeInTheDocument()
    })

    it('should name each numbered passage the way the Act cites it', () => {
      render(
        <ActReader
          docked
          version="original"
          openId="anx_III"
          cited={[{ provisionId: 'anx_III', label: 'Annex III' }]}
          onClose={vi.fn()}
          onVersionChange={vi.fn()}
        />,
      )

      expect(screen.getByText('Annex III, point 4(a)')).toBeInTheDocument()
    })

    it('should label the provisions an answer cites as cited', () => {
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
        screen.getByRole('navigation', { name: 'Cited in this answer' }),
      ).toBeInTheDocument()
    })

    it('should offer a refusal its reading list rather than a wall of links', () => {
      render(
        <ActReader
          docked
          version="consolidated"
          openId="art_6"
          cited={cited}
          citedAs="read"
          onClose={vi.fn()}
          onVersionChange={vi.fn()}
        />,
      )

      expect(
        screen.getByRole('button', {
          name: '2 provisions read before refusing',
        }),
      ).toBeInTheDocument()
      expect(
        screen.queryByRole('navigation', { name: 'Cited in this answer' }),
      ).not.toBeInTheDocument()
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
      expect(screen.getByRole('button', { name: 'The walk' })).toHaveAttribute(
        'aria-pressed',
        'true',
      )
    })

    it('should draw the selected view as an underline rather than a fill', () => {
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

      const selected = screen.getByRole('button', { name: 'The walk' })
      const unselected = screen.getByRole('button', { name: 'The Act' })
      expect(selected.className).not.toMatch(/\bbg-/)
      expect(selected).toHaveClass('border-accent')
      expect(unselected.className).not.toMatch(/\bbg-/)
      expect(unselected).toHaveClass('border-transparent')
    })

    it('should highlight the words the amendment changed on the opened provision', () => {
      render(
        <ActReader
          docked
          version="consolidated"
          openId="art_95.4"
          cited={cited}
          onClose={vi.fn()}
          onVersionChange={vi.fn()}
        />,
      )

      expect(screen.getByText('and SMCs').tagName).toBe('MARK')
    })

    it('should render a changed word in the surrounding text color rather than the browser default', () => {
      render(
        <ActReader
          docked
          version="consolidated"
          openId="art_95.4"
          cited={cited}
          onClose={vi.fn()}
          onVersionChange={vi.fn()}
        />,
      )

      expect(screen.getByText('and SMCs')).toHaveClass('text-inherit')
    })

    it('should join a run of changed words across whitespace into one mark', () => {
      render(
        <ActReader
          docked
          version="consolidated"
          openId="art_50.7"
          cited={[{ provisionId: 'art_50.7', label: 'Article 50(7)' }]}
          onClose={vi.fn()}
          onVersionChange={vi.fn()}
        />,
      )

      expect(document.querySelectorAll('mark')).toHaveLength(8)
    })

    it('should land a paragraph in the rounded, padded tint a section already has', () => {
      render(
        <ActReader
          docked
          version="consolidated"
          openId="art_50.6"
          cited={cited}
          onClose={vi.fn()}
          onVersionChange={vi.fn()}
        />,
      )

      expect(
        screen
          .getByText(/^6\. Paragraphs 1 to 4 shall not affect/)
          .closest('[aria-current="location"]'),
      ).toHaveClass('rounded-[6px]')
    })

    it('should clear the highlight once the pane moves to an unchanged provision', () => {
      const { rerender } = render(
        <ActReader
          docked
          version="consolidated"
          openId="art_95.4"
          cited={cited}
          onClose={vi.fn()}
          onVersionChange={vi.fn()}
        />,
      )

      expect(screen.getByText('and SMCs').tagName).toBe('MARK')

      rerender(
        <ActReader
          docked
          version="consolidated"
          openId="art_6"
          cited={cited}
          onClose={vi.fn()}
          onVersionChange={vi.fn()}
        />,
      )

      expect(document.querySelector('mark')).not.toBeInTheDocument()
    })
  })

  it('should name the text it is showing', () => {
    render(
      <ActReader
        version="consolidated"
        openId="art_6"
        onClose={vi.fn()}
        onVersionChange={vi.fn()}
      />,
    )

    expect(screen.getByText('Reading the amended text')).toBeInTheDocument()
  })

  it('should hand the other text back to its caller from the link', async () => {
    const onVersionChange = vi.fn()
    render(
      <ActReader
        version="consolidated"
        openId="art_6"
        onClose={vi.fn()}
        onVersionChange={onVersionChange}
      />,
    )

    await userEvent.click(
      screen.getByRole('button', { name: 'Read the original text' }),
    )

    expect(onVersionChange).toHaveBeenCalledWith('original')
  })

  it('should reach the other text from the keyboard', async () => {
    const onVersionChange = vi.fn()
    render(
      <ActReader
        docked
        version="original"
        openId="art_6"
        onClose={vi.fn()}
        onVersionChange={onVersionChange}
      />,
    )

    screen.getByRole('button', { name: 'Read the amended text' }).focus()
    await userEvent.keyboard('{Enter}')

    expect(onVersionChange).toHaveBeenCalledWith('consolidated')
  })

  it('should draw no version toggle beside the text', () => {
    render(
      <ActReader
        docked
        version="consolidated"
        openId="art_6"
        onClose={vi.fn()}
        onVersionChange={vi.fn()}
      />,
    )

    expect(
      screen.queryByRole('button', { name: 'Original' }),
    ).not.toBeInTheDocument()
  })
})
