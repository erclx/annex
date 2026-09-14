import type { RecordedQuestion } from '@/lib/replay'

/**
 * How the recording went for one question, in words rather than a mark.
 *
 * Computed from the manifest's per-version `refused` flags and never typed, so
 * a re-capture that changes an outcome changes the card. The operator's
 * second-use pass measured the refusal and accent tokens as one dark dot at 6
 * pixels in both themes, so the words carry the outcome and nothing beside
 * them does.
 */
export function outcomeLine(refused: RecordedQuestion['refused']): string {
  if (refused.original && refused.consolidated) return 'Refused on both texts'
  if (refused.original)
    return 'Refused on the original, answered on the amended'
  if (refused.consolidated)
    return 'Answered on the original, refused on the amended'
  return 'Answered on both texts'
}
