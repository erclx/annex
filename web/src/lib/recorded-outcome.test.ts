import { describe, expect, it } from 'vitest'

import { outcomeLine } from '@/lib/recorded-outcome'

describe('outcomeLine', () => {
  it('should say a question answered on both texts was answered on both', () => {
    expect(outcomeLine({ original: false, consolidated: false })).toBe(
      'Answered on both texts',
    )
  })

  it('should say a question refused on both texts was refused on both', () => {
    expect(outcomeLine({ original: true, consolidated: true })).toBe(
      'Refused on both texts',
    )
  })

  it('should name the original as the text that refused when only it did', () => {
    expect(outcomeLine({ original: true, consolidated: false })).toBe(
      'Refused on the original, answered on the amended',
    )
  })

  it('should name the amended as the text that refused when only it did', () => {
    expect(outcomeLine({ original: false, consolidated: true })).toBe(
      'Answered on the original, refused on the amended',
    )
  })
})
