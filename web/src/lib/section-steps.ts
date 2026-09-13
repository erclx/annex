import type { CitedProvision } from '@/components/act-reader'

export interface SectionSummary {
  id: string
  label: string
  title: string
}

export type StepMode = 'all' | 'cited'

export interface StepState {
  sections: readonly SectionSummary[]
  currentIndex: number
  cited: readonly CitedProvision[]
  citedIndex: number | null
  mode: StepMode
}

/**
 * Where one step from the current position lands, or `null` past either end.
 *
 * Shared by the section bar's arrows and the Act pane's arrow keys, so the two
 * can never disagree about what the next provision is.
 */
export function stepTarget(state: StepState, delta: -1 | 1): string | null {
  if (state.mode === 'cited') {
    if (state.citedIndex === null) {
      const edge = delta > 0 ? 0 : state.cited.length - 1
      return state.cited[edge]?.provisionId ?? null
    }
    return state.cited[state.citedIndex + delta]?.provisionId ?? null
  }
  return state.sections[state.currentIndex + delta]?.id ?? null
}

/**
 * The section a typed jump names: an article by its number, such as `49` or
 * `4a`, or an annex by its numeral in any case, such as `iii`.
 */
export function jumpTarget(
  sections: readonly SectionSummary[],
  typed: string,
): string | null {
  const value = typed.trim()
  let id: string
  if (/^\d+[a-z]?$/i.test(value)) id = `art_${value.toLowerCase()}`
  else if (/^[ivxlc]+$/i.test(value)) id = `anx_${value.toUpperCase()}`
  else return null
  return sections.some((section) => section.id === id) ? id : null
}
