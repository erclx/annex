'use client'

import { type ReactNode, useCallback, useMemo, useState } from 'react'

import {
  type AskHandoff,
  AskHandoffContext,
  DEFAULT_HANDOFF,
} from '@/lib/ask-handoff'

/**
 * Holds the handoff between the landing page and `/ask` in memory above both,
 * since the root layout survives a client navigation and a page does not.
 *
 * Neither storage nor the address carries it. A typed description can run to 4
 * 000 characters and says what someone is building, which `@/lib/address`
 * keeps out of the history and `.claude/rules/canon/lib/350-security-web.md`
 * keeps out of `sessionStorage`. The cost is that a reload of `/ask` on the
 * live build has nothing to ask.
 */
export function AskHandoffProvider({ children }: { children: ReactNode }) {
  const [handoff, setWhole] = useState<AskHandoff>(DEFAULT_HANDOFF)

  const setHandoff = useCallback((next: Partial<AskHandoff>) => {
    setWhole((current) => ({ ...current, ...next }))
  }, [])

  const value = useMemo(() => ({ handoff, setHandoff }), [handoff, setHandoff])

  return (
    <AskHandoffContext.Provider value={value}>
      {children}
    </AskHandoffContext.Provider>
  )
}
