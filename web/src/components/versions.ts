import type { Answer } from '@/lib/answer'

/**
 * The two texts, and the parts of an answer the surface renders.
 *
 * Every type here is derived from `answerSchema` rather than declared, so a
 * schema regenerated from the Python models moves these with it. Declaring any
 * of them by hand would put a second shape beside the generated one, which is
 * the drift generating the file was chosen to prevent.
 */
export type CorpusVersion = Answer['version']
export type Citation = Answer['claims'][number]['citations'][number]
export type Refusal = NonNullable<Answer['refusal']>
export type Retrieval = Answer['retrieval']

/** What the amended text is called wherever a reader is asked to choose it. */
export const VERSION_LABEL: Record<CorpusVersion, string> = {
  original: 'the original text',
  consolidated: 'the amended text',
}
