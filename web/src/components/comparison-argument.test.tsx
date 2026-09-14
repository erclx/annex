import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { ComparisonArgument } from '@/components/comparison-argument'
import { baselineModel, embeddingModel } from '@/lib/evaluation-summary'

describe('ComparisonArgument', () => {
  it('should head the pipeline and the comparison separately', () => {
    render(<ComparisonArgument />)

    expect(
      screen.getByRole('heading', { name: 'How an answer is built' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'The three-arm comparison' }),
    ).toBeInTheDocument()
  })

  it('should introduce the pipeline before drawing it', () => {
    render(<ComparisonArgument />)

    expect(
      screen.getByText(
        'Five stages, in the order a question passes through them.',
      ),
    ).toBeInTheDocument()
  })

  it('should caption the bracket without pointing at where the table sits', () => {
    render(<ComparisonArgument />)

    const figure = screen.getByRole('img', { name: /The five-stage pipeline/ })
    expect(figure).toHaveAccessibleName(
      /The comparison switches these two on and off\.$/,
    )
    expect(figure.getAttribute('aria-label')).not.toMatch(/below|above/)
  })

  it('should read the models in the hardware line from the evaluation fixture', () => {
    render(<ComparisonArgument />)

    expect(
      screen.getByText(
        new RegExp(`generates with ${baselineModel()};.*${embeddingModel()}`),
      ),
    ).toBeInTheDocument()
  })
})
