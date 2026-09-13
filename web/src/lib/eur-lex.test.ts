import { describe, expect, it } from 'vitest'

import type { Citation } from '@/components/versions'
import { eurLexUrl } from '@/lib/eur-lex'

function citation(
  provisionId: string,
  version: Citation['version'] = 'consolidated',
): Citation {
  return {
    change_note: null,
    changed: false,
    citation: provisionId,
    kind: 'article',
    provision_id: provisionId,
    text: 'text',
    version,
  }
}

describe('eurLexUrl', () => {
  it.each([
    [
      'art_6',
      'https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:02024R1689-20260727#art_6',
    ],
    [
      'art_6.2',
      'https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:02024R1689-20260727#art_6',
    ],
    [
      'art_4a',
      'https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:02024R1689-20260727#art_4a',
    ],
    [
      'art_60a',
      'https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:02024R1689-20260727#art_60a',
    ],
    [
      'anx_III',
      'https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:02024R1689-20260727#anx_III',
    ],
    [
      'rct_132',
      'https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:02024R1689-20260727#rct_132',
    ],
    [
      'unrecognized_1',
      'https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:02024R1689-20260727',
    ],
  ])(
    'should resolve %s to %s on the consolidated text',
    (provisionId, expected) => {
      expect(eurLexUrl(citation(provisionId))).toBe(expected)
    },
  )

  it('should deep-link an article on the original text to the OJ source', () => {
    expect(eurLexUrl(citation('art_6', 'original'))).toBe(
      'https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=OJ:L_202401689#art_6',
    )
  })

  it('should deep-link an annex on the original text to the OJ source', () => {
    expect(eurLexUrl(citation('anx_III', 'original'))).toBe(
      'https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=OJ:L_202401689#anx_III',
    )
  })

  it('should deep-link a recital on the original text to the OJ source', () => {
    expect(eurLexUrl(citation('rct_132', 'original'))).toBe(
      'https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=OJ:L_202401689#rct_132',
    )
  })
})
