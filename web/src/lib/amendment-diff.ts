import { findProvision } from '@/lib/corpus'

/**
 * A word diff between one provision's two exported texts, read as a word diff
 * rather than a character diff so a rewrapped sentence with no wording change
 * reads as unchanged. `added` and `removed` cover a provision the amendment
 * introduced or dropped, where there is no other side to diff against.
 *
 * The diff is lexical: it reports a reordering as a removal beside an
 * insertion, since nothing here reads meaning. `changed` on each `DiffSpan`
 * marks a word this provision's own side does not share with the other, never
 * whether that word was literally inserted or deleted.
 */
export type AmendmentDiffStatus = 'changed' | 'added' | 'removed'

/** One run of a provision's text, unbroken by a change in `changed`. */
export interface DiffSpan {
  readonly text: string
  readonly changed: boolean
}

export interface AmendmentDiff {
  readonly status: AmendmentDiffStatus
  readonly original: readonly DiffSpan[] | null
  readonly consolidated: readonly DiffSpan[] | null
}

interface Token {
  readonly text: string
  readonly isWord: boolean
}

const TOKEN = /[\p{L}\p{N}]+|[^\p{L}\p{N}]+/gu

function tokenize(text: string): Token[] {
  return (text.match(TOKEN) ?? []).map((chunk) => ({
    text: chunk,
    isWord: /[\p{L}\p{N}]/u.test(chunk),
  }))
}

/**
 * Which words on each side have no match on the other, by the longest common
 * subsequence of the two word arrays. Gaps, being whitespace and punctuation,
 * never reach here, which is what lets spacing before punctuation and a
 * rewrapped line differ between the two texts without reading as changed.
 */
function diffWords(
  a: readonly string[],
  b: readonly string[],
): { aChanged: boolean[]; bChanged: boolean[] } {
  const n = a.length
  const m = b.length
  const table: number[][] = Array.from({ length: n + 1 }, () =>
    new Array<number>(m + 1).fill(0),
  )
  for (let i = n - 1; i >= 0; i -= 1) {
    for (let j = m - 1; j >= 0; j -= 1) {
      table[i][j] =
        a[i] === b[j]
          ? table[i + 1][j + 1] + 1
          : Math.max(table[i + 1][j], table[i][j + 1])
    }
  }

  const aChanged = new Array<boolean>(n).fill(true)
  const bChanged = new Array<boolean>(m).fill(true)
  let i = 0
  let j = 0
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      aChanged[i] = false
      bChanged[j] = false
      i += 1
      j += 1
    } else if (table[i + 1][j] >= table[i][j + 1]) {
      i += 1
    } else {
      j += 1
    }
  }
  return { aChanged, bChanged }
}

function buildSpans(
  tokens: readonly Token[],
  wordChanged: readonly boolean[],
): DiffSpan[] {
  const spans: DiffSpan[] = []
  let wordIndex = 0
  for (const token of tokens) {
    const changed = token.isWord ? wordChanged[wordIndex++] : false
    const last = spans[spans.length - 1]
    if (last !== undefined && last.changed === changed) {
      spans[spans.length - 1] = { text: last.text + token.text, changed }
    } else {
      spans.push({ text: token.text, changed })
    }
  }
  return spans
}

function wholeSpans(text: string): DiffSpan[] {
  return text === '' ? [] : [{ text, changed: false }]
}

function computeDiff(provisionId: string): AmendmentDiff {
  const original = findProvision('original', provisionId)
  const consolidated = findProvision('consolidated', provisionId)

  if (original === undefined) {
    return consolidated === undefined
      ? { status: 'removed', original: null, consolidated: null }
      : {
          status: 'added',
          original: null,
          consolidated: wholeSpans(consolidated.text),
        }
  }
  if (consolidated === undefined) {
    return {
      status: 'removed',
      original: wholeSpans(original.text),
      consolidated: null,
    }
  }

  const originalTokens = tokenize(original.text)
  const consolidatedTokens = tokenize(consolidated.text)
  const { aChanged, bChanged } = diffWords(
    originalTokens.filter((token) => token.isWord).map((token) => token.text),
    consolidatedTokens
      .filter((token) => token.isWord)
      .map((token) => token.text),
  )

  return {
    status: 'changed',
    original: buildSpans(originalTokens, aChanged),
    consolidated: buildSpans(consolidatedTokens, bChanged),
  }
}

const cache = new Map<string, AmendmentDiff>()

/** The word diff for one provision id, memoized once per id across both texts. */
export function amendmentDiff(provisionId: string): AmendmentDiff {
  const cached = cache.get(provisionId)
  if (cached !== undefined) return cached
  const diff = computeDiff(provisionId)
  cache.set(provisionId, diff)
  return diff
}

/**
 * The spans falling within `[start, end)` of the text they were built from,
 * cut at the character offset closest-point.ts's own segments already carry.
 */
export function sliceDiffSpans(
  spans: readonly DiffSpan[],
  start: number,
  end: number = Infinity,
): DiffSpan[] {
  const result: DiffSpan[] = []
  let position = 0
  for (const span of spans) {
    const spanStart = position
    const spanEnd = position + span.text.length
    position = spanEnd
    if (spanEnd <= start || spanStart >= end) continue
    const text = span.text.slice(
      Math.max(start, spanStart) - spanStart,
      Math.min(end, spanEnd) - spanStart,
    )
    if (text !== '') result.push({ text, changed: span.changed })
  }
  return result
}

/**
 * `spans` with a whitespace-only gap between two changed spans folded into
 * one changed span, so a changed phrase draws as one mark with one unbroken
 * underline rather than one mark per word. A gap holding punctuation still
 * breaks the run, since only whitespace between two changed words reads as
 * the same run continuing.
 *
 * This is a rendering join rather than a diff decision: `buildSpans` still
 * marks each word on its own, and this runs after `sliceDiffSpans` and
 * `trimDiffSpans` so a cut or trimmed boundary is never joined across.
 */
export function joinDiffSpans(spans: readonly DiffSpan[]): DiffSpan[] {
  const result: DiffSpan[] = []
  let index = 0
  while (index < spans.length) {
    const span = spans[index]
    const last = result[result.length - 1]
    const next = spans[index + 1]
    const isWhitespaceGap = !span.changed && span.text.trim() === ''
    if (
      isWhitespaceGap &&
      last !== undefined &&
      last.changed &&
      next !== undefined &&
      next.changed
    ) {
      result[result.length - 1] = {
        text: last.text + span.text + next.text,
        changed: true,
      }
      index += 2
      continue
    }
    result.push(span)
    index += 1
  }
  return result
}

/**
 * `spans` with any leading or trailing whitespace-only text removed, to match
 * a segment `closest-point.ts` cut with its own trailing `.trim()`.
 */
export function trimDiffSpans(spans: readonly DiffSpan[]): DiffSpan[] {
  let start = 0
  while (start < spans.length && spans[start].text.trim() === '') start += 1
  let end = spans.length
  while (end > start && spans[end - 1].text.trim() === '') end -= 1
  const middle = spans.slice(start, end)
  if (middle.length === 0) return []

  const result = [...middle]
  result[0] = { ...result[0], text: result[0].text.replace(/^\s+/, '') }
  const lastIndex = result.length - 1
  result[lastIndex] = {
    ...result[lastIndex],
    text: result[lastIndex].text.replace(/\s+$/, ''),
  }
  return result
}
