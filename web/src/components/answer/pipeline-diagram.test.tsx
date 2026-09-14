import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { PipelineDiagram } from '@/components/answer/pipeline-diagram'

const STAGE_LABELS = ['Intake', 'Retrieve', 'Traverse', 'Synthesize', 'Verify']
const CAPTION = 'The comparison switches these two on and off.'

describe('PipelineDiagram', () => {
  it('renders every stage label exactly once in each of the row and rail blocks', () => {
    const { container } = render(<PipelineDiagram />)

    for (const label of STAGE_LABELS) {
      const matches = [...container.querySelectorAll('div')].filter(
        (el) =>
          el.textContent === label && el.className.includes('font-semibold'),
      )
      expect(matches).toHaveLength(2)
    }
  })

  it('renders the caption exactly twice, once per drawing', () => {
    render(<PipelineDiagram />)

    expect(screen.getAllByText(CAPTION)).toHaveLength(2)
  })

  it('describes the whole figure with one shared role="img" wrapper', () => {
    render(<PipelineDiagram />)

    const images = screen.getAllByRole('img', {
      name: /The five-stage pipeline/,
    })
    expect(images).toHaveLength(1)
  })

  it('covers Retrieve and Traverse with a bracket in both drawings', () => {
    const { container } = render(<PipelineDiagram />)

    const paths = container.querySelectorAll('svg path')
    expect(paths).toHaveLength(2)

    const dots = [...container.querySelectorAll('span.rounded-full')]
    const bracketedDots = dots.filter((dot) =>
      dot.className.includes('bg-accent'),
    )
    // Two drawings, two bracketed stages each.
    expect(bracketedDots).toHaveLength(4)
  })

  it("switches the two drawings on the component's own rendered width, not a prop", () => {
    const { container } = render(<PipelineDiagram />)

    const wrappers = container.firstElementChild?.children
    expect(wrappers).toHaveLength(2)
    expect(wrappers?.[0].className).toContain('@min-[657px]:hidden')
    expect(wrappers?.[1].className).toContain('hidden')
    expect(wrappers?.[1].className).toContain('@min-[657px]:block')
  })
})
