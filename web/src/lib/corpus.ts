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

const KIND_NAME: Record<string, string> = {
  art: 'Article',
  anx: 'Annex',
  rct: 'Recital',
}

const citationsByVersion = new Map<CorpusVersion, Map<string, string>>()

/**
 * How the Act cites a provision, such as `Article 50(1)`, by its id.
 *
 * Read off the export where this version carries the id. A stream frame or a
 * trace can name an id only the other version holds, such as a recital the
 * amended text dropped, so the fallback spells the id the same way rather than
 * showing a raw `rct_132`.
 */
export function citationLabel(
  version: CorpusVersion,
  provisionId: string,
): string {
  let citations = citationsByVersion.get(version)
  if (!citations) {
    citations = new Map(
      PROVISIONS[version].map((provision) => [
        provision.id,
        provision.citation,
      ]),
    )
    citationsByVersion.set(version, citations)
  }
  const exported = citations.get(provisionId)
  if (exported) return exported

  const separator = provisionId.indexOf('_')
  const kind = provisionId.slice(0, separator)
  const [number, ...parts] = provisionId.slice(separator + 1).split('.')
  const name = KIND_NAME[kind] ?? kind
  return `${name} ${number}${parts.map((part) => `(${part})`).join('')}`
}
