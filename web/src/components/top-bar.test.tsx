import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { TopBar } from '@/components/top-bar'

describe('TopBar', () => {
  it('should link to the repository and the evaluation', () => {
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

    const evaluation = screen.getByRole('link', { name: 'Evaluation' })
    expect(evaluation).toHaveAttribute(
      'href',
      'https://github.com/erclx/annex/blob/main/docs/evaluation.md',
    )
  })
})
