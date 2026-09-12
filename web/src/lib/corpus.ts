import type { CorpusVersion } from '@/components/versions'
import consolidatedProvisions from '@/fixtures/corpus/consolidated.json'
import originalProvisions from '@/fixtures/corpus/original.json'

/**
 * The two versions' provisions, as `annex.corpus.export` writes them.
 *
 * Hand-typed rather than generated. Six flat fields with no nesting and no
 * union variants is a shape unlikely to grow, unlike the answer schema this
 * project does generate `web/src/lib/answer.ts` from.
 */
export interface Provision {
  id: string
  kind: 'article' | 'annex' | 'recital' | 'paragraph'
  number: string
  title: string
  text: string
  version: CorpusVersion
  parent_id: string | null
  amended: boolean
  citation: string
}

const PROVISIONS: Record<CorpusVersion, Provision[]> = {
  original: originalProvisions as Provision[],
  consolidated: consolidatedProvisions as Provision[],
}

/** Every provision of one version, in document order. */
export function provisionsFor(version: CorpusVersion): Provision[] {
  return PROVISIONS[version]
}

/** One provision by id, or `undefined` if this version does not carry it. */
export function findProvision(
  version: CorpusVersion,
  provisionId: string,
): Provision | undefined {
  return PROVISIONS[version].find((provision) => provision.id === provisionId)
}
