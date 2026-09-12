import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { TopBar } from '@/components/top-bar'

describe('TopBar', () => {
  it('links to the repository and the evaluation, open in a new tab', () => {
    render(
      <TopBar
        version="consolidated"
        onVersionChange={vi.fn()}
        traversal={true}
        onTraversalChange={vi.fn()}
        disabled={false}
      />,
    )

    const repository = screen.getByRole('link', { name: 'Repository' })
    expect(repository).toHaveAttribute('href', 'https://github.com/erclx/annex')
    expect(repository).toHaveAttribute('target', '_blank')

    const evaluation = screen.getByRole('link', { name: 'Evaluation' })
    expect(evaluation).toHaveAttribute(
      'href',
      'https://github.com/erclx/annex/blob/main/docs/evaluation.md',
    )
  })
})
