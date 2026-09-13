import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { TopBar } from '@/components/top-bar'

function renderBar(overrides: Partial<Parameters<typeof TopBar>[0]> = {}) {
  render(
    <TopBar
      version="consolidated"
      onVersionChange={vi.fn()}
      traversal={true}
      onTraversalChange={vi.fn()}
      disabled={false}
      {...overrides}
    />,
  )
}

describe('TopBar', () => {
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

  it('should drop the tagline and the links once slim', () => {
    renderBar({ slim: true })

    expect(
      screen.queryByText('Which articles of the EU AI Act you have to read'),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('link', { name: 'Repository' }),
    ).not.toBeInTheDocument()
    expect(
      screen.getByRole('group', { name: 'Which text to read against' }),
    ).toBeInTheDocument()
  })

  it('should hold the brand alone when the controls sit elsewhere', () => {
    renderBar({ showControls: false })

    expect(screen.getByText('Annex')).toBeInTheDocument()
    expect(
      screen.queryByRole('group', { name: 'Which text to read against' }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('switch', { name: 'Reference traversal' }),
    ).not.toBeInTheDocument()
  })
})
