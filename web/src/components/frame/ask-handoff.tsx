'use client'

import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'

import {
  type AskHandoff,
  AskHandoffContext,
  DEFAULT_HANDOFF,
  type KeptAnswer,
  KeptAnswerContext,
} from '@/lib/browser/ask-handoff'

/**
 * Holds the handoff between the landing page and `/ask`, and the last settled
 * answer `/ask` left with, in memory above both, since the root layout
 * survives a client navigation and a page does not.
 *
 * The two live in one context each rather than one shared shape, since the
 * handoff carries what the landing page hands over and the kept answer
 * carries what `/ask` hands back, and each consumer then re-renders only on
 * the direction it reads.
 *
 * Neither storage nor the address carries either. A typed description can run
 * to 4 000 characters and says what someone is building, which
 * `@/lib/browser/address` keeps out of the history and
 * `.claude/rules/canon/lib/350-security-web.md` keeps out of
 * `sessionStorage`, and an answer quoting that description falls under the
 * same rule. The cost is that a reload of `/ask` on the live build has
 * nothing to ask.
 */
export function AskHandoffProvider({ children }: { children: ReactNode }) {
  const [handoff, setWhole] = useState<AskHandoff>(DEFAULT_HANDOFF)
  const [keptAnswer, setKeptAnswer] = useState<KeptAnswer | null>(null)

  // The app router restores scroll on a back or forward navigation itself,
  // which races a kept answer's own restore of the same offset. Taking the
  // browser's native history scroll restoration out of that race, once, for
  // the life of the session, is what turns the kept answer's restore into
  // the only write rather than one of two.
  useEffect(() => {
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual'
    }
  }, [])

  const setHandoff = useCallback((next: Partial<AskHandoff>) => {
    setWhole((current) => ({ ...current, ...next }))
  }, [])

  const handoffValue = useMemo(
    () => ({ handoff, setHandoff }),
    [handoff, setHandoff],
  )
  const keptAnswerValue = useMemo(
    () => ({ keptAnswer, setKeptAnswer }),
    [keptAnswer],
  )

  return (
    <AskHandoffContext.Provider value={handoffValue}>
      <KeptAnswerContext.Provider value={keptAnswerValue}>
        {children}
      </KeptAnswerContext.Provider>
    </AskHandoffContext.Provider>
  )
}
