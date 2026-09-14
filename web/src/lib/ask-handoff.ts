'use client'

import { createContext, useContext } from 'react'

import type { CorpusVersion } from '@/components/versions'

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
