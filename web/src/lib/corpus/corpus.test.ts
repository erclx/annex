import { describe, expect, it } from 'vitest'

import { citationLabel, findProvision, provisionsFor } from './corpus'

describe('provisionsFor', () => {
  it('should return every provision in document order for each version', () => {
    expect(provisionsFor('original').length).toBeGreaterThan(0)
    expect(provisionsFor('consolidated').length).toBeGreaterThan(0)
  })

  it('should keep the two versions independent', () => {
    expect(provisionsFor('original')).not.toBe(provisionsFor('consolidated'))
  })
})

describe('findProvision', () => {
  it('should find article 6 by id in the original text', () => {
    const provision = findProvision('original', 'art_6')

    expect(provision?.kind).toBe('article')
    expect(provision?.number).toBe('6')
  })

  it('should carry the reader-facing citation label the export writes', () => {
    expect(findProvision('original', 'art_6')?.citation).toBe('Article 6')
  })

  it('should find article 6 by id in the amended text', () => {
    const provision = findProvision('consolidated', 'art_6')

    expect(provision?.kind).toBe('article')
  })

  it('should return undefined for an id this version does not carry', () => {
    expect(findProvision('original', 'nonexistent')).toBeUndefined()
  })
})

describe('citationLabel', () => {
  it('should name a paragraph the way the export cites it', () => {
    expect(citationLabel('consolidated', 'art_50.1')).toBe('Article 50(1)')
  })

  it('should spell an id this version does not carry rather than show it raw', () => {
    expect(citationLabel('consolidated', 'rct_132')).toBe('Recital 132')
  })
})
