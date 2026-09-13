/**
 * Where in a long provision a claim's evidence sits, read off the provision's
 * own numbering.
 *
 * Picked in the operator's first-use pass as L2 and L3, arm 2: a provision is
 * split into paragraphs, definitions and points, the segment sharing the most
 * words with the claim wins when it shares at least `MINIMUM_SHARED_WORDS`,
 * and the citation is named as that point. Otherwise the excerpt stays at the
 * top, since no single passage wins.
 *
 * The rule is lexical and its threshold was fitted by looking at three cases,
 * where a margin between the best and second-best passage failed to separate
 * a right match from a wrong one. So a landing is labelled closest, never
 * quoted: it is the passage sharing the most words, not the passage the model
 * read the claim from.
 */

export const MINIMUM_SHARED_WORDS = 8

type MarkerType = 'dot' | 'number' | 'letter' | 'roman'

export interface Marker {
  readonly type: MarkerType
  readonly value: string
}

/** One numbered passage, located by its offset into the provision's text. */
export interface Segment {
  readonly start: number
  readonly markers: readonly Marker[]
  readonly path: readonly string[]
  readonly text: string
}

export type Landing =
  | { kind: 'point'; segment: Segment; name: string; shared: number }
  | { kind: 'top' }
  | { kind: 'whole' }

const ROMANS = [
  'i',
  'ii',
  'iii',
  'iv',
  'v',
  'vi',
  'vii',
  'viii',
  'ix',
  'x',
  'xi',
  'xii',
  'xiii',
  'xiv',
  'xv',
]

const FIRST: Record<MarkerType, string> = {
  dot: '1',
  number: '1',
  letter: 'a',
  roman: 'i',
}

const MARKER = /(\d+)\.\s|\((\d+)\)\s|\(([a-z]{1,4})\)\s/g

/**
 * A numbering marker opens a passage only after the end of a sentence, a
 * lead-in colon, or a list's closing `; and`. That is what separates `8. The
 * testing` from the `60.` closing `in accordance with Article 60.`.
 */
const OPENS_A_PASSAGE = /(^|[.:;]\s+|[;,]\s+(and|or)\s+)$/

function nextValue(type: MarkerType, value: string): string {
  if (type === 'letter') return String.fromCharCode(value.charCodeAt(0) + 1)
  if (type === 'roman') return ROMANS[ROMANS.indexOf(value) + 1] ?? ''
  return String(Number(value) + 1)
}

function candidatesFor(match: RegExpExecArray): Marker[] {
  const [, dot, number, letters] = match
  if (dot !== undefined) return [{ type: 'dot', value: dot }]
  if (number !== undefined) return [{ type: 'number', value: number }]
  const candidates: Marker[] = []
  if (letters.length === 1) candidates.push({ type: 'letter', value: letters })
  if (ROMANS.includes(letters))
    candidates.push({ type: 'roman', value: letters })
  return candidates
}

/**
 * Where a marker sits in the numbering already open, or `null` when it is not
 * numbering at all.
 *
 * A marker continues a level when it is that level's next value, closing every
 * deeper level. It opens a deeper level only on that level's first value, so a
 * paragraph reading `(b)` with no `(a)` before it is a reference rather than a
 * point. The first marker of a text may open on any value, since a paragraph
 * cited on its own starts at its own number.
 */
function place(
  open: readonly Marker[],
  candidates: readonly Marker[],
  isTextStart: boolean,
): Marker[] | null {
  for (let depth = open.length - 1; depth >= 0; depth -= 1) {
    const level = open[depth]
    const continued = candidates.find(
      (candidate) =>
        candidate.type === level.type &&
        candidate.value === nextValue(level.type, level.value),
    )
    if (continued) return [...open.slice(0, depth), continued]
  }

  if (open.length === 0 && isTextStart && candidates.length > 0) {
    return [candidates[0]]
  }

  const opened = candidates.find(
    (candidate) =>
      candidate.value === FIRST[candidate.type] &&
      !open.some((level) => level.type === candidate.type),
  )
  return opened ? [...open, opened] : null
}

/** A provision's text cut at its own numbering, lead-in first when it has one. */
export function segmentsOf(text: string): Segment[] {
  const starts: { start: number; markers: Marker[] }[] = []
  let open: Marker[] = []

  for (const match of text.matchAll(MARKER)) {
    const start = match.index
    const before = text.slice(Math.max(0, start - 12), start)
    // An article's heading runs straight into its first paragraph, as in
    // `Risk management system 1. A risk management system`, with no sentence
    // end before the `1.`.
    const isFirstParagraph = open.length === 0 && match[1] === FIRST.dot
    if (start !== 0 && !isFirstParagraph && !OPENS_A_PASSAGE.test(before)) {
      continue
    }

    const placed = place(open, candidatesFor(match), start === 0)
    if (placed === null) continue
    open = placed
    starts.push({ start, markers: placed })
  }

  const segments: Segment[] = []
  const lead = text.slice(0, starts[0]?.start ?? text.length).trim()
  if (lead !== '') {
    segments.push({ start: 0, markers: [], path: [], text: lead })
  }
  starts.forEach(({ start, markers }, index) => {
    const end = starts[index + 1]?.start ?? text.length
    segments.push({
      start,
      markers,
      path: markers.map((marker) => marker.value),
      text: text.slice(start, end).trim(),
    })
  })
  return segments
}

/**
 * Words of four letters or more, so `the`, `of` and `an AI` never decide a
 * landing. Counting every word matched the picked draft's recorded landings on
 * 26 of its 47 long citations, and counting these matched 42.
 */
const MINIMUM_WORD_LENGTH = 4

function wordsOf(text: string): Set<string> {
  const words = text.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? []
  return new Set(words.filter((word) => word.length >= MINIMUM_WORD_LENGTH))
}

/** How many distinct words of four letters or more a passage shares with a claim. */
export function sharedWordCount(claim: string, passage: string): number {
  const claimWords = wordsOf(claim)
  let shared = 0
  for (const word of wordsOf(passage)) {
    if (claimWords.has(word)) shared += 1
  }
  return shared
}

/**
 * A segment's name in the form the Act cites it: `Article 79(8)`,
 * `Article 6(3), point (a)`, `Article 3, point (12)`, `Annex III, point 4(a)`.
 *
 * A paragraph citation already names its paragraph, so the paragraph marker its
 * own text opens on is not named twice.
 */
export function pointName(
  citation: string,
  markers: readonly Marker[],
): string {
  let rest = markers
  const [first] = rest
  if (first?.type === 'dot' && citation.endsWith(`(${first.value})`)) {
    rest = rest.slice(1)
  }

  const parenthesized = (items: readonly Marker[]) =>
    items.map((marker) => `(${marker.value})`).join('')

  if (/^Annex\b/.test(citation)) {
    const [head, ...tail] = rest
    if (head === undefined) return citation
    return head.type === 'dot'
      ? `${citation}, point ${head.value}${parenthesized(tail)}`
      : `${citation}, point ${parenthesized(rest)}`
  }

  let name = citation
  if (rest[0]?.type === 'dot') {
    name += `(${rest[0].value})`
    rest = rest.slice(1)
  }
  return rest.length > 0 ? `${name}, point ${parenthesized(rest)}` : name
}

/**
 * Where an excerpt for `claim` opens in `citation`.
 *
 * `whole` is a provision with fewer than two numbered passages, where there is
 * nothing to choose between. `top` is a provision where no passage shares
 * enough words to win. Ties go to the earlier passage.
 */
export function closestPoint(
  citation: { readonly citation: string; readonly text: string },
  claim: string,
): Landing {
  const numbered = segmentsOf(citation.text).filter(
    (segment) => segment.path.length > 0,
  )
  if (numbered.length < 2) return { kind: 'whole' }

  let best = numbered[0]
  let bestShared = -1
  for (const segment of numbered) {
    const shared = sharedWordCount(claim, segment.text)
    if (shared > bestShared) {
      best = segment
      bestShared = shared
    }
  }

  if (bestShared < MINIMUM_SHARED_WORDS) return { kind: 'top' }
  return {
    kind: 'point',
    segment: best,
    name: pointName(citation.citation, best.markers),
    shared: bestShared,
  }
}
