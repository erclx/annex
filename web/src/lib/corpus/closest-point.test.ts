import { describe, expect, it } from 'vitest'

import { closestPoint, segmentsOf } from '@/lib/corpus/closest-point'
import { findProvision } from '@/lib/corpus/corpus'

function provisionText(provisionId: string): string {
  const provision = findProvision('original', provisionId)
  if (!provision) throw new Error(`No provision ${provisionId} in the corpus`)
  return provision.text
}

function cite(citation: string, provisionId: string) {
  return { citation, text: provisionText(provisionId) }
}

describe('segmentsOf', () => {
  it('should split an article at its own paragraph numbering', () => {
    const paths = segmentsOf(provisionText('art_9')).map((segment) =>
      segment.path.join('.'),
    )

    expect(paths).toContain('8')
    expect(paths).toContain('10')
  })

  it('should not read a number closing a cross-reference as a paragraph', () => {
    const paths = segmentsOf(provisionText('art_9')).map((segment) =>
      segment.path.join('.'),
    )

    expect(paths).not.toContain('60')
  })

  it('should open a segment on the text its numbering starts', () => {
    const segment = segmentsOf(provisionText('art_9')).find(
      (candidate) => candidate.path.join('.') === '8',
    )

    expect(segment?.text.startsWith('8. The testing of high-risk')).toBe(true)
  })

  it('should split a paragraph citation starting mid-sequence at its points', () => {
    const paths = segmentsOf(provisionText('art_6.3')).map((segment) =>
      segment.path.join('.'),
    )

    expect(paths).toEqual(expect.arrayContaining(['3', '3.a', '3.b']))
  })
})

describe('closestPoint', () => {
  it('should land on the paragraph a claim rests on and name it', () => {
    const landing = closestPoint(
      cite('Article 79', 'art_79'),
      'In the market surveillance procedure, the three-month objection period for provisional measures is reduced to 30 days in the event of non-compliance with the prohibition of the AI practices referred to in Article 5',
    )

    expect(landing).toMatchObject({ kind: 'point', name: 'Article 79(8)' })
  })

  it('should name an annex point the way the Act cites it', () => {
    const landing = closestPoint(
      cite('Annex III', 'anx_III'),
      'The system falls within Annex III point 4(a), covering AI systems intended to be used for the recruitment or selection of natural persons, in particular to analyse and filter job applications and to evaluate candidates',
    )

    expect(landing).toMatchObject({
      kind: 'point',
      name: 'Annex III, point 4(a)',
    })
  })

  it('should name a definition as a point of its article', () => {
    const landing = closestPoint(
      cite('Article 3', 'art_3'),
      'The "intended purpose" of the system, as specified by the provider in the instructions for use, promotional or sales materials, or technical documentation, encompasses scoring university applications and deciding which applicants are admitted',
    )

    expect(landing).toMatchObject({
      kind: 'point',
      name: 'Article 3, point (12)',
    })
  })

  it('should name a point inside a cited paragraph after the paragraph', () => {
    const landing = closestPoint(
      cite('Article 6(3)', 'art_6.3'),
      'The exemption covers an AI system intended to improve the result of a previously completed human activity',
    )

    expect(landing).toMatchObject({
      kind: 'point',
      name: 'Article 6(3), point (b)',
    })
  })

  it('should stay at the top when no passage shares 8 words with the claim', () => {
    const landing = closestPoint(
      cite('Annex III', 'anx_III'),
      'A voice agent confirming appointments does not on its face fall within any listed area',
    )

    expect(landing).toEqual({ kind: 'top' })
  })

  it('should leave a provision with no numbered passages whole', () => {
    const landing = closestPoint(
      cite('Article 9(8)', 'art_9.8'),
      'Testing shall be carried out against prior defined metrics and probabilistic thresholds appropriate to the intended purpose',
    )

    expect(landing).toEqual({ kind: 'whole' })
  })
})
