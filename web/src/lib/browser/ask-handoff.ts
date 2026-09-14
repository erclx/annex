'use client'

import { createContext, useContext } from 'react'

import type { CorpusVersion } from '@/components/shared/versions'
import type { AskResult } from '@/lib/service/ask'

/**
 * What a navigation carries between the landing page and `/ask`.
 *
 * `rejected` is the service turning a description down after the landing page
 * passed it, which `/ask` sends back so the message renders on the composer,
 * where `canon/wireframes/answer.md` § Invalid puts it.
 */
export interface AskHandoff {
  description: string
  version: CorpusVersion
  traversal: boolean
  rejected: boolean
}

export interface AskHandoffValue {
  handoff: AskHandoff
  setHandoff: (next: Partial<AskHandoff>) => void
}

export const DEFAULT_HANDOFF: AskHandoff = {
  description: '',
  version: 'consolidated',
  traversal: true,
  rejected: false,
}

/**
 * Held apart from `AskHandoffProvider` so that file exports a component alone,
 * which fast refresh needs to keep its state across an edit.
 */
export const AskHandoffContext = createContext<AskHandoffValue | null>(null)

export function useAskHandoff(): AskHandoffValue {
  const value = useContext(AskHandoffContext)
  if (value === null) {
    throw new Error('useAskHandoff needs an AskHandoffProvider above it.')
  }
  return value
}

/** A settled ask, the only outcome a return to `/ask` restores rather than re-asks. */
export type SettledAskResult = Extract<
  AskResult,
  { state: 'answered' | 'refused' }
>

/** What a return has to match before a kept answer replaces asking again. */
export interface KeptAnswerKey {
  description: string
  version: CorpusVersion
  traversal: boolean
}

/**
 * The last settled answer `/ask` left with, restored on a return matching its
 * key rather than asked again. One answer stays kept until another question
 * replaces it.
 */
export interface KeptAnswer {
  key: KeptAnswerKey
  result: SettledAskResult
  provisionId: string | null
  point: string | null
  pageScrollY: number
  paneScrollTop: number
}

export interface KeptAnswerValue {
  keptAnswer: KeptAnswer | null
  setKeptAnswer: (next: KeptAnswer) => void
}

export const KeptAnswerContext = createContext<KeptAnswerValue | null>(null)

export function useKeptAnswer(): KeptAnswerValue {
  const value = useContext(KeptAnswerContext)
  if (value === null) {
    throw new Error('useKeptAnswer needs a KeptAnswerProvider above it.')
  }
  return value
}

export function keptAnswerMatches(
  key: KeptAnswerKey,
  other: KeptAnswerKey,
): boolean {
  return (
    key.description === other.description &&
    key.version === other.version &&
    key.traversal === other.traversal
  )
}
