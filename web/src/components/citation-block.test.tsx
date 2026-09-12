import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { CitationBlock } from '@/components/citation-block'
import type { Citation } from '@/components/versions'

const CITATION: Citation = {
  change_note: null,
  changed: false,
  citation: 'Article 6',
  kind: 'article',
  provision_id: 'art_6',
  text: 'Classification rules for high-risk AI systems.',
  version: 'consolidated',
}

describe('CitationBlock', () => {
  it('should render the citation as plain text with no onOpen', () => {
    render(<CitationBlock citation={CITATION} />)

    expect(screen.queryByRole('button')).not.toBeInTheDocument()
    expect(screen.getByText('Article 6')).toBeInTheDocument()
  })

  it('should render the citation as a control when onOpen is supplied', async () => {
    const onOpen = vi.fn()
    render(<CitationBlock citation={CITATION} onOpen={onOpen} />)

    await userEvent.click(screen.getByRole('button', { name: 'Article 6' }))

    expect(onOpen).toHaveBeenCalledWith('art_6', 'consolidated')
  })

  it('should link a paragraph citation to its parent article on EUR-Lex', () => {
    render(
      <CitationBlock
        citation={{
          ...CITATION,
          citation: 'Article 6(2)',
          provision_id: 'art_6.2',
        }}
      />,
    )

    const link = screen.getByRole('link', { name: /EUR-Lex/ })
    expect(link).toHaveAttribute(
      'href',
      'https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:02024R1689-20260727#art_6',
    )
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('should link a non-article citation to the document root with no fragment', () => {
    render(
      <CitationBlock
        citation={{
          ...CITATION,
          citation: 'Annex III(5)(b)',
          provision_id: 'anx_III.5.b',
          kind: 'annex',
        }}
      />,
    )

    const link = screen.getByRole('link', { name: /EUR-Lex/ })
    expect(link).toHaveAttribute(
      'href',
      'https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:02024R1689-20260727',
    )
  })
})
