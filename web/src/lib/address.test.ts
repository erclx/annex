import { describe, expect, it } from 'vitest'

import { addressSearch, readAddress } from '@/lib/address'

describe('readAddress', () => {
  it('should read the question, the version and the open provision', () => {
    expect(readAddress('?q=q04-cv-screening&v=original&p=anx_III')).toEqual({
      question: 'q04-cv-screening',
      version: 'original',
      provision: 'anx_III',
    })
  })

  it('should drop a version that is not one of the two texts', () => {
    expect(readAddress('?v=draft&p=art_6.3')).toEqual({ provision: 'art_6.3' })
  })

  it('should drop a provision that is not shaped like a provision id', () => {
    expect(readAddress('?v=consolidated&p=art_6%20or%201')).toEqual({
      version: 'consolidated',
    })
  })

  it('should drop a question that is not shaped like a recorded question id', () => {
    expect(readAddress('?q=a%20chatbot%20for%20our%20bank')).toEqual({})
  })

  it('should read nothing from an empty address', () => {
    expect(readAddress('')).toEqual({})
  })
})

describe('addressSearch', () => {
  it('should write the fields it is given in a fixed order', () => {
    expect(
      addressSearch({
        provision: 'anx_III',
        version: 'original',
        question: 'q04-cv-screening',
      }),
    ).toBe('?q=q04-cv-screening&v=original&p=anx_III')
  })

  it('should write nothing for an empty address', () => {
    expect(addressSearch({})).toBe('')
  })

  it('should write what readAddress reads back unchanged', () => {
    const address = { version: 'consolidated', provision: 'art_50.1' } as const

    expect(readAddress(addressSearch(address))).toEqual(address)
  })
})
