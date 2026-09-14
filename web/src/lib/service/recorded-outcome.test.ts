import { describe, expect, it } from 'vitest'

import { outcomeLine } from '@/lib/service/recorded-outcome'

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

  it('should say a text holds no recording rather than claim it was answered', () => {
    expect(outcomeLine({ original: null, consolidated: false })).toBe(
      'Not recorded on the original, answered on the amended',
    )
  })

  it('should say a text holds no recording beside a refusal on the other', () => {
    expect(outcomeLine({ original: true, consolidated: null })).toBe(
      'Refused on the original, not recorded on the amended',
    )
  })
})
