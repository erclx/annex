import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import Evaluation from '@/app/evaluation/page'

vi.mock('next/navigation', () => ({ usePathname: () => '/evaluation' }))

describe('Evaluation', () => {
  it('heads the page and links out to the full write-up', () => {
    render(<Evaluation />)

    expect(
      screen.getByRole('heading', { name: 'Evaluation' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: 'The full write-up is on GitHub →' }),
    ).toHaveAttribute(
      'href',
      'https://github.com/erclx/annex/blob/main/docs/evaluation.md',
    )
  })

  it('carries the terms strip and the three-arm comparison', () => {
    render(<Evaluation />)

    expect(screen.getByText('Terms used on this page')).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'The three-arm comparison' }),
    ).toBeInTheDocument()
  })
})
