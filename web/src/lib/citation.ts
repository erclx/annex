/** A provision the answer cites, as the agent reports it. */
export type Citation = {
  readonly id: string
  readonly label: string
}

/**
 * Renders a provision id as the label a reader recognizes from the Act itself,
 * so `art_6` reads as `Article 6` rather than as an internal key.
 */
export const citationLabel = (id: string): string => {
  const [kind, number] = id.split('_')

  if (kind === 'art') return `Article ${number}`
  if (kind === 'anx') return `Annex ${number}`
  if (kind === 'rct') return `Recital ${number}`

  return id
}
