import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { CitationBlock } from '@/components/citation-block'
import type { Citation } from '@/components/versions'
import { findProvision } from '@/lib/corpus'

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
  })

  it('should link an annex paragraph citation to its parent annex on EUR-Lex', () => {
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
      'https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:02024R1689-20260727#anx_III',
    )
  })

  it('should link a recital citation to its own anchor on EUR-Lex', () => {
    render(
      <CitationBlock
        citation={{
          ...CITATION,
          citation: 'Recital 132',
          provision_id: 'rct_132',
          kind: 'recital',
          version: 'original',
        }}
      />,
    )

    const link = screen.getByRole('link', { name: /EUR-Lex/ })
    expect(link).toHaveAttribute(
      'href',
      'https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=OJ:L_202401689#rct_132',
    )
  })

  it('should name the full length on the handle when the excerpt is cut', async () => {
    const onOpen = vi.fn()
    const long = { ...CITATION, text: 'x'.repeat(17615) }
    render(<CitationBlock citation={long} onOpen={onOpen} />)

    await userEvent.click(
      screen.getByRole('button', {
        name: 'Read all 17 615 characters in the Act',
      }),
    )

    expect(onOpen).toHaveBeenCalledWith('art_6', 'consolidated')
  })

  describe('an excerpt under a claim', () => {
    const annex = findProvision('original', 'anx_III')
    const ANNEX_III: Citation = {
      ...CITATION,
      citation: 'Annex III',
      kind: 'annex',
      provision_id: 'anx_III',
      version: 'original',
      text: annex?.text ?? '',
    }
    const RECRUITMENT =
      'The system falls within Annex III point 4(a), covering AI systems intended to be used for the recruitment or selection of natural persons, in particular to analyse and filter job applications and to evaluate candidates'

    it('should open on the closest point and name it', () => {
      render(
        <CitationBlock
          citation={ANNEX_III}
          claim={RECRUITMENT}
          onOpen={vi.fn()}
        />,
      )

      expect(
        screen.getByRole('button', { name: 'Annex III, point 4(a)' }),
      ).toBeInTheDocument()
      expect(screen.getByText('closest point')).toBeInTheDocument()
      expect(
        screen.getByText(
          /^… \(a\) AI systems intended to be used for the recruitment/,
        ),
      ).toBeInTheDocument()
    })

    it('should never call a closest point a quotation', () => {
      render(<CitationBlock citation={ANNEX_III} claim={RECRUITMENT} />)

      expect(screen.queryByText(/quot/i)).not.toBeInTheDocument()
    })

    it('should stay at the top and say so when no passage wins', () => {
      render(
        <CitationBlock
          citation={ANNEX_III}
          claim="A voice agent confirming appointments falls within no listed area"
        />,
      )

      expect(screen.getByText('Annex III')).toBeInTheDocument()
      expect(
        screen.getByText('whole provision, no single passage wins'),
      ).toBeInTheDocument()
    })

    it('should hand Read all the point the excerpt opened on', async () => {
      const onOpen = vi.fn()
      render(
        <CitationBlock
          citation={ANNEX_III}
          claim={RECRUITMENT}
          onOpen={onOpen}
        />,
      )

      await userEvent.click(
        screen.getByRole('button', {
          name: /^Read all .* characters in the Act/,
        }),
      )

      expect(onOpen).toHaveBeenCalledWith('anx_III', 'original', '4.a')
    })
  })

  it('should name the length of a short provision too, since the clamp may still cut it', () => {
    render(<CitationBlock citation={CITATION} onOpen={vi.fn()} lines={3} />)

    expect(
      screen.getByRole('button', {
        name: 'Read all 46 characters in the Act',
      }),
    ).toBeInTheDocument()
  })

  describe('a changed citation', () => {
    const CHANGED: Citation = {
      ...CITATION,
      citation: 'Article 95(4)',
      provision_id: 'art_95.4',
      version: 'consolidated',
      text: findProvision('consolidated', 'art_95.4')?.text ?? '',
      changed: true,
    }

    it('should highlight the words the amendment added', () => {
      render(<CitationBlock citation={CHANGED} />)

      expect(screen.getByText('SMCs').tagName).toBe('MARK')
    })

    it('should render no highlight on an unchanged citation', () => {
      render(<CitationBlock citation={CITATION} />)

      expect(document.querySelector('mark')).not.toBeInTheDocument()
    })

    it('should swap the shown text when the version control is activated', async () => {
      render(<CitationBlock citation={CHANGED} />)

      expect(screen.getByText('SMCs')).toBeInTheDocument()

      await userEvent.click(
        screen.getByRole('button', { name: 'Read the original text' }),
      )

      expect(screen.queryByText('SMCs')).not.toBeInTheDocument()
      expect(
        screen.getByRole('button', { name: 'Read the amended text' }),
      ).toBeInTheDocument()
    })
  })

  describe('a citation the amendment added or removed', () => {
    const ADDED: Citation = {
      ...CITATION,
      citation: 'Article 111(4)',
      kind: 'paragraph',
      provision_id: 'art_111.4',
      version: 'consolidated',
      text: findProvision('consolidated', 'art_111.4')?.text ?? '',
      changed: true,
    }
    const REMOVED: Citation = {
      ...CITATION,
      citation: 'Recital 132',
      kind: 'recital',
      provision_id: 'rct_132',
      version: 'original',
      text: findProvision('original', 'rct_132')?.text ?? '',
      changed: true,
    }

    it('should say a provision was added rather than moved', () => {
      render(<CitationBlock citation={ADDED} />)

      expect(screen.getByText('added by the amendment')).toBeInTheDocument()
      expect(document.querySelector('mark')).not.toBeInTheDocument()
      expect(
        screen.queryByRole('button', { name: /^Read the/ }),
      ).not.toBeInTheDocument()
    })

    it('should say a provision was removed rather than moved', () => {
      render(<CitationBlock citation={REMOVED} />)

      expect(screen.getByText('removed by the amendment')).toBeInTheDocument()
      expect(document.querySelector('mark')).not.toBeInTheDocument()
      expect(
        screen.queryByRole('button', { name: /^Read the/ }),
      ).not.toBeInTheDocument()
    })
  })
})
