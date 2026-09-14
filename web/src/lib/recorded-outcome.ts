import type { CorpusVersion } from '@/components/versions'
import type { RecordedQuestion } from '@/lib/replay'

const TEXT_NAME: Record<CorpusVersion, string> = {
  original: 'the original',
  consolidated: 'the amended',
}

function outcomeOn(refused: boolean | null, version: CorpusVersion): string {
  if (refused === null) return `not recorded on ${TEXT_NAME[version]}`
  return `${refused ? 'refused' : 'answered'} on ${TEXT_NAME[version]}`
}

/**
 * How the recording went for one question, in words rather than a mark.
 *
 * Computed from the manifest's per-version `refused` flags and never typed, so
 * a re-capture that changes an outcome changes the card. The operator's
 * second-use pass measured the refusal and accent tokens as one dark dot at 6
 * pixels in both themes, so the words carry the outcome and nothing beside
 * them does.
 *
 * A text the recording holds no entry for says so rather than reading as
 * answered, since the card's whole claim is what the recording shows.
 */
export function outcomeLine(refused: RecordedQuestion['refused']): string {
  if (refused.original !== null && refused.original === refused.consolidated) {
    return refused.original ? 'Refused on both texts' : 'Answered on both texts'
  }
  const line = `${outcomeOn(refused.original, 'original')}, ${outcomeOn(refused.consolidated, 'consolidated')}`
  return `${line.charAt(0).toUpperCase()}${line.slice(1)}`
}
