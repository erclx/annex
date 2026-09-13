import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { SectionBar } from '@/components/section-bar'

const sections = [
  { id: 'art_49', label: 'Article 49', title: 'Registration' },
  {
    id: 'art_50',
    label: 'Article 50',
    title: 'Transparency obligations for providers and deployers',
  },
  { id: 'anx_III', label: 'Annex III', title: 'High-risk AI systems' },
]

const cited = [
  { provisionId: 'art_49', label: 'Article 49' },
  { provisionId: 'art_50.5', label: 'Article 50(5)' },
  { provisionId: 'art_50.6', label: 'Article 50(6)' },
]

function renderBar(overrides: Partial<Parameters<typeof SectionBar>[0]> = {}) {
  const props = {
    sections,
    currentIndex: 1,
    cited,
    citedIndex: 1,
    mode: 'all' as const,
    onModeChange: vi.fn(),
    onGo: vi.fn(),
    ...overrides,
  }
  render(<SectionBar {...props} />)
  return props
}

describe('SectionBar', () => {
  it('should name the section in view and its place among every section', () => {
    renderBar()

    expect(screen.getByText('Article 50')).toBeInTheDocument()
    expect(screen.getByText('2 of 3')).toBeInTheDocument()
  })

  it('should step to the next section in document order', async () => {
    const { onGo } = renderBar()

    await userEvent.click(screen.getByRole('button', { name: 'Next section' }))

    expect(onGo).toHaveBeenCalledWith('anx_III')
  })

  it('should step to the previous section in document order', async () => {
    const { onGo } = renderBar()

    await userEvent.click(
      screen.getByRole('button', { name: 'Previous section' }),
    )

    expect(onGo).toHaveBeenCalledWith('art_49')
  })

  it('should hold the previous step inactive at the first section', () => {
    renderBar({ currentIndex: 0 })

    expect(
      screen.getByRole('button', { name: 'Previous section' }),
    ).toBeDisabled()
  })

  it('should hold the next step inactive at the last section', () => {
    renderBar({ currentIndex: 2 })

    expect(screen.getByRole('button', { name: 'Next section' })).toBeDisabled()
  })

  it('should jump to an article by its number', async () => {
    const { onGo } = renderBar()

    await userEvent.type(
      screen.getByRole('textbox', { name: 'Go to an article or annex' }),
      '49{Enter}',
    )

    expect(onGo).toHaveBeenCalledWith('art_49')
  })

  it('should jump to an annex by its numeral in any case', async () => {
    const { onGo } = renderBar()

    await userEvent.type(
      screen.getByRole('textbox', { name: 'Go to an article or annex' }),
      'iii{Enter}',
    )

    expect(onGo).toHaveBeenCalledWith('anx_III')
  })

  it('should go nowhere when the jump names no section', async () => {
    const { onGo } = renderBar()

    await userEvent.type(
      screen.getByRole('textbox', { name: 'Go to an article or annex' }),
      '999{Enter}',
    )

    expect(onGo).not.toHaveBeenCalled()
  })

  it('should hand a switch to cited provisions back to its caller', async () => {
    const { onModeChange } = renderBar()

    await userEvent.click(screen.getByRole('button', { name: 'Cited' }))

    expect(onModeChange).toHaveBeenCalledWith('cited')
  })

  describe('stepping through cited provisions', () => {
    it('should name the cited paragraph and count among the citations', () => {
      renderBar({ mode: 'cited' })

      expect(screen.getByText('Article 50(5)')).toBeInTheDocument()
      expect(screen.getByText('2 of 3 cited')).toBeInTheDocument()
    })

    it('should step to the next cited provision rather than the next section', async () => {
      const { onGo } = renderBar({ mode: 'cited' })

      await userEvent.click(
        screen.getByRole('button', { name: 'Next cited provision' }),
      )

      expect(onGo).toHaveBeenCalledWith('art_50.6')
    })

    it('should hold the next step inactive at the last citation', () => {
      renderBar({ mode: 'cited', citedIndex: 2 })

      expect(
        screen.getByRole('button', { name: 'Next cited provision' }),
      ).toBeDisabled()
    })
  })
})
