'use client'

import { useSyncExternalStore } from 'react'

/**
 * The one breakpoint `.claude/DESIGN.md` § Layout records.
 *
 * At this width and wider the Act docks beside the answer, and below it the
 * page is one column and the Act opens as an overlay.
 */
const DOCKED_QUERY = '(min-width: 1024px)'

/** False on the server, and wherever the browser store API is absent. */
function canReadViewport(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
}

function subscribe(onChange: () => void): () => void {
  if (!canReadViewport()) return () => undefined
  const query = window.matchMedia(DOCKED_QUERY)
  query.addEventListener('change', onChange)
  return () => {
    query.removeEventListener('change', onChange)
  }
}

function readViewport(): boolean {
  if (!canReadViewport()) return false
  return window.matchMedia(DOCKED_QUERY).matches
}

/**
 * Whether the viewport is wide enough to dock the Act beside the answer.
 *
 * The static export renders with no viewport to read, so the server snapshot is
 * the single column and the first client render corrects it.
 */
export function useDocked(): boolean {
  return useSyncExternalStore(subscribe, readViewport, () => false)
}
