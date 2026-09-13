import type { CorpusVersion } from '@/components/versions'
import summary from '@/fixtures/evaluation-summary.json'

/**
 * One arm's scores on one version, as `annex.eval.report.ArmSummary` writes it.
 *
 * Hand-typed rather than generated, following `corpus.ts`'s precedent rather
 * than `answer.ts`'s: flat scalars with no nesting and no union variants, a
 * shape unlikely to grow the way the answer schema does.
 */
export interface ArmSummary {
  arm: 'full-context' | 'search-only' | 'search-traversal'
  version: CorpusVersion
  answered: number
  failed: number
  recall: number
  recall_reached: number
  precision_over_nodes: number
  precision_over_articles: number
  nodes_supplied: number
  faithfulness: number | null
  refusal_questions: number
  correct_refusals: number
  answer_questions: number
  false_refusals: number
  truncated: number
  prompt_tokens: number
  completion_tokens: number
  duration_ms: number
  first_call_ms: number | null
  later_calls_ms: number | null
  projected_cost: number
}

interface EvaluationSummary {
  commit: string
  captured_at: string
  generation_model: string
  embedding_model: string
  arms: ArmSummary[]
}

const SUMMARY = summary as EvaluationSummary

/** Every arm's scores, in the order `annex.__main__.ARM_NAMES` reads best. */
export function armSummaries(): ArmSummary[] {
  return SUMMARY.arms
}

/** The commit the summary was generated from, so a stale fixture is visible. */
export function summaryCommit(): string {
  return SUMMARY.commit
}

/** The model the two retrieval arms generate with. The baseline uses its own. */
export function generationModel(): string {
  return SUMMARY.generation_model
}

/** The model both retrieval arms embed and search with. */
export function embeddingModel(): string {
  return SUMMARY.embedding_model
}
