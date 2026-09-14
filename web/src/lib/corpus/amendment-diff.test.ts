import { describe, expect, it } from 'vitest'

import {
  amendmentDiff,
  type DiffSpan,
  joinDiffSpans,
  sliceDiffSpans,
  trimDiffSpans,
} from '@/lib/corpus/amendment-diff'

function changedText(spans: readonly DiffSpan[] | null): string[] {
  return (spans ?? []).filter((span) => span.changed).map((span) => span.text)
}

function fullText(spans: readonly DiffSpan[] | null): string {
  return (spans ?? []).map((span) => span.text).join('')
}

describe('amendmentDiff', () => {
  it('should mark the words one side adds and leave the shared words unmarked', () => {
    const diff = amendmentDiff('art_95.4')

    expect(diff.status).toBe('changed')
    expect(changedText(diff.original)).toEqual([])
    expect(changedText(diff.consolidated)).toEqual(['and', 'SMCs'])
  })

  it('should reproduce both texts exactly from their spans', () => {
    const diff = amendmentDiff('art_95.4')

    expect(fullText(diff.original)).toBe(
      '4. The AI Office and the Member States shall take into account the specific interests and needs of SMEs, including start-ups, when encouraging and facilitating the drawing up of codes of conduct.',
    )
    expect(fullText(diff.consolidated)).toBe(
      '4. The AI Office and the Member States shall take into account the specific interests and needs of SMEs, including start-ups, and SMCs, when encouraging and facilitating the drawing up of codes of conduct.',
    )
  })

  it('should ignore spacing before punctuation', () => {
    const diff = amendmentDiff('art_100.2')

    expect(diff.status).toBe('changed')
    expect(changedText(diff.original)).toEqual([])
    expect(changedText(diff.consolidated)).toEqual([])
  })

  it('should mark nothing changed when the two texts are word-for-word identical', () => {
    const diff = amendmentDiff('art_2.5')

    expect(diff.status).toBe('changed')
    expect(changedText(diff.original)).toEqual([])
    expect(changedText(diff.consolidated)).toEqual([])
  })

  it('should read a provision present in the consolidated text alone as added', () => {
    const diff = amendmentDiff('art_111.4')

    expect(diff.status).toBe('added')
    expect(diff.original).toBeNull()
    expect(diff.consolidated).not.toBeNull()
  })

  it('should read a provision present in the original text alone as removed', () => {
    const diff = amendmentDiff('rct_132')

    expect(diff.status).toBe('removed')
    expect(diff.consolidated).toBeNull()
    expect(diff.original).not.toBeNull()
  })

  it('should memoize the diff for one provision id', () => {
    expect(amendmentDiff('art_95.4')).toBe(amendmentDiff('art_95.4'))
  })
})

describe('sliceDiffSpans', () => {
  const spans: DiffSpan[] = [
    { text: 'one ', changed: false },
    { text: 'two', changed: true },
    { text: ' three', changed: false },
  ]

  it('should keep only the spans falling inside the range', () => {
    expect(sliceDiffSpans(spans, 4, 7)).toEqual([
      { text: 'two', changed: true },
    ])
  })

  it('should cut a span at the range boundary rather than dropping it whole', () => {
    expect(sliceDiffSpans(spans, 2, 5)).toEqual([
      { text: 'e ', changed: false },
      { text: 't', changed: true },
    ])
  })

  it('should default the end of the range to the end of the text', () => {
    expect(sliceDiffSpans(spans, 4)).toEqual([
      { text: 'two', changed: true },
      { text: ' three', changed: false },
    ])
  })
})

describe('joinDiffSpans', () => {
  it('should join two changed spans across a whitespace-only gap', () => {
    const spans: DiffSpan[] = [
      { text: 'one', changed: true },
      { text: ' ', changed: false },
      { text: 'two', changed: true },
    ]

    expect(joinDiffSpans(spans)).toEqual([{ text: 'one two', changed: true }])
  })

  it('should join a whole chain of changed words separated by single spaces', () => {
    const spans: DiffSpan[] = [
      { text: 'a', changed: true },
      { text: ' ', changed: false },
      { text: 'b', changed: true },
      { text: ' ', changed: false },
      { text: 'c', changed: true },
    ]

    expect(joinDiffSpans(spans)).toEqual([{ text: 'a b c', changed: true }])
  })

  it('should never join across a gap holding punctuation', () => {
    const spans: DiffSpan[] = [
      { text: 'one', changed: true },
      { text: ', ', changed: false },
      { text: 'two', changed: true },
    ]

    expect(joinDiffSpans(spans)).toEqual(spans)
  })

  it('should leave an unchanged gap between two unchanged spans alone', () => {
    const spans: DiffSpan[] = [
      { text: 'one', changed: false },
      { text: ' ', changed: false },
      { text: 'two', changed: false },
    ]

    expect(joinDiffSpans(spans)).toEqual(spans)
  })

  it('should reduce Article 50(7) of the consolidated text from 38 marks to 8', () => {
    const diff = amendmentDiff('art_50.7')
    const consolidated = diff.consolidated ?? []

    expect(consolidated.filter((span) => span.changed)).toHaveLength(38)
    expect(
      joinDiffSpans(consolidated).filter((span) => span.changed),
    ).toHaveLength(8)
  })
})

describe('trimDiffSpans', () => {
  it('should drop whitespace-only spans from both ends', () => {
    const spans: DiffSpan[] = [
      { text: '  ', changed: false },
      { text: 'word', changed: true },
      { text: '  ', changed: false },
    ]

    expect(trimDiffSpans(spans)).toEqual([{ text: 'word', changed: true }])
  })

  it('should trim leading and trailing whitespace off the edge spans', () => {
    const spans: DiffSpan[] = [
      { text: '  lead', changed: false },
      { text: 'ing and trail', changed: true },
      { text: 'ing  ', changed: false },
    ]

    expect(trimDiffSpans(spans)).toEqual([
      { text: 'lead', changed: false },
      { text: 'ing and trail', changed: true },
      { text: 'ing', changed: false },
    ])
  })

  it('should return an empty array when every span is whitespace', () => {
    expect(trimDiffSpans([{ text: '   ', changed: false }])).toEqual([])
  })
})
