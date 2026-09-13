'use client'

import { type RefObject, useEffect, useState } from 'react'

/**
 * What an unpublished bar height reads as, matching the `0px` fallback the
 * sticky panes give the same property, so one unset value means one thing.
 */
const FALLBACK_BAR_HEIGHT = 0

function pinnedBarHeight(): number {
  const published = Number.parseInt(
    getComputedStyle(document.documentElement).getPropertyValue(
      '--annex-bar-height',
    ),
    10,
  )
  return Number.isFinite(published) && published > 0
    ? published
    : FALLBACK_BAR_HEIGHT
}

/**
 * Whether a marker element has scrolled up under the pinned bar.
 *
 * The top bar slims once the described system has gone under it, so the marker
 * is measured against the space below the bar rather than the viewport's top
 * edge. A marker that has not yet scrolled into view from below reads as not
 * past, which is the difference `boundingClientRect.top` settles.
 */
export function useScrolledPast(
  marker: RefObject<HTMLElement | null>,
  watchKey?: string,
): boolean {
  const [isPast, setIsPast] = useState(false)

  // `watchKey` names which element the marker currently sits on, so the
  // observer re-attaches when the page swaps the form for an answer and the
  // ref starts pointing somewhere else.
  useEffect(() => {
    const element = marker.current
    if (!element || typeof IntersectionObserver === 'undefined') return
    const barHeight = pinnedBarHeight()
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries.at(-1)
        if (!entry) return
        setIsPast(
          !entry.isIntersecting && entry.boundingClientRect.top < barHeight,
        )
      },
      { rootMargin: `-${barHeight}px 0px 0px 0px` },
    )
    observer.observe(element)
    return () => {
      observer.disconnect()
    }
  }, [marker, watchKey])

  return isPast
}
