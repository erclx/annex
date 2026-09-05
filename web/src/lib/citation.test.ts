import { describe, expect, it } from 'vitest'

import { citationLabel } from './citation'

describe('citationLabel', () => {
  it('names an article by its number', () => {
    expect(citationLabel('art_6')).toBe('Article 6')
  })

  it('names an annex by its roman numeral', () => {
    expect(citationLabel('anx_III')).toBe('Annex III')
  })

  it('names a recital by its number', () => {
    expect(citationLabel('rct_12')).toBe('Recital 12')
  })

  it('returns an unrecognized id unchanged', () => {
    expect(citationLabel('preamble')).toBe('preamble')
  })
})
