import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { TopBar } from '@/components/top-bar'

function renderBar(overrides: Partial<Parameters<typeof TopBar>[0]> = {}) {
  render(
    <TopBar
      traversal={true}
      onTraversalChange={vi.fn()}
      disabled={false}
      {...overrides}
    />,
  )
}

class SilentResizeObserver {
  observe() {
    return undefined
  }
  disconnect() {
    return undefined
  }
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('TopBar', () => {
  it('should publish its height at mount rather than waiting on the observer', () => {
    vi.stubGlobal('ResizeObserver', SilentResizeObserver)

    renderBar()

    expect(
      document.documentElement.style.getPropertyValue('--annex-bar-height'),
    ).toMatch(/^\d+px$/)
  })

  it('should link to the repository and the evaluation', () => {
    renderBar()

    const repository = screen.getByRole('link', { name: 'Repository' })
    expect(repository).toHaveAttribute('href', 'https://github.com/erclx/annex')

    const evaluation = screen.getByRole('link', { name: 'Evaluation' })
    expect(evaluation).toHaveAttribute(
      'href',
      'https://github.com/erclx/annex/blob/main/docs/evaluation.md',
    )
  })

  it('should say what turning traversal off compares on the live build', () => {
    renderBar()

    expect(
      screen.getByText('Turn off to compare against search alone'),
    ).toBeInTheDocument()
  })

  it('should say the recording was taken with traversal on', () => {
    renderBar({ traversalFixed: true })

    expect(screen.getByText('Recorded with traversal on')).toBeInTheDocument()
  })

  it('should carry no demo or recorded chip beside the switch', () => {
    renderBar()

    expect(screen.queryByText(/^demo$/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/^recorded$/i)).not.toBeInTheDocument()
  })

  it('should link the mark and the name to the empty page', () => {
    renderBar()

    expect(screen.getByRole('link', { name: 'Annex' })).toHaveAttribute(
      'href',
      '/',
    )
  })

  it('should keep the links while the traversal switch sits elsewhere', () => {
    renderBar({ showTraversal: false })

    expect(screen.getByRole('link', { name: 'Repository' })).toBeInTheDocument()
    expect(
      screen.queryByRole('switch', { name: 'Reference traversal' }),
    ).not.toBeInTheDocument()
  })

  it('should draw no version toggle, which the composer and the card carry', () => {
    renderBar()

    expect(
      screen.queryByRole('group', { name: 'Which text to read against' }),
    ).not.toBeInTheDocument()
  })
})
