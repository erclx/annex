import { describe, expect, it } from 'vitest'

import { findProvision, provisionsFor } from './corpus'

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

  it('should find article 6 by id in the amended text', () => {
    const provision = findProvision('consolidated', 'art_6')

    expect(provision?.kind).toBe('article')
  })

  it('should return undefined for an id this version does not carry', () => {
    expect(findProvision('original', 'nonexistent')).toBeUndefined()
  })
})
