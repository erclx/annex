/**
 * Renders a bare provision id as the label a reader recognizes from the Act.
 *
 * This is for the retrieval trace, where `searched_ids`, `traversed_ids` and
 * `dropped_ids` arrive as ids with no label beside them. A provision the answer
 * actually cites carries its own reader-facing `citation` string on the citation
 * object, so nothing needs this helper for that.
 *
 * The paragraph form matches `Provision.citation` in `python/src/annex/corpus/models.py`,
 * which writes `Article 50(3)`. Ids carry at most one paragraph level.
 */
export function citationLabel(id: string): string {
  const separator = id.indexOf('_')
  if (separator === -1) return id

  const kind = id.slice(0, separator)
  const rest = id.slice(separator + 1)
  if (rest === '') return id

  const [number, paragraph] = rest.split('.')

  if (kind === 'art')
    return paragraph ? `Article ${number}(${paragraph})` : `Article ${number}`
  if (kind === 'anx') return `Annex ${rest}`
  if (kind === 'rct') return `Recital ${rest}`

  return id
}
