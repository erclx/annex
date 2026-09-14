'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useRef } from 'react'

/**
 * Remembers each route's own scroll offset in memory for the life of the
 * tab, and restores it on a return, standing in for the native scroll
 * restoration `web/src/components/frame/ask-handoff.tsx` turns off for the
 * whole session so `/ask` can restore a kept answer without racing it.
 *
 * A plain module-level map rather than React state, since a write on every
 * scroll event has no reason to re-render anything and the value only
 * needs to survive the unmount a route change is about to cause.
 */
const remembered = new Map<string, number>()

export function useScrollRestore(): void {
  const pathname = usePathname()

  /**
   * Set once a link press has frozen the tracked offset for the leave in
   * progress, so the scroll listener stops overwriting it with the app
   * router's own scroll-to-top for that same transition, which still fires
   * as a real scroll event while this page is mounted. A short timeout
   * releases a freeze the press never turned into a navigation, the same
   * pattern `web/src/app/ask/page.tsx` uses for its own restore.
   */
  const frozen = useRef(false)
  const thaw = useRef(0)

  useEffect(() => {
    function handleScroll() {
      if (frozen.current) return
      remembered.set(pathname, window.scrollY)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', handleScroll)
    }
  }, [pathname])

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (!(event.target instanceof Element)) return
      if (!event.target.closest('a')) return
      remembered.set(pathname, window.scrollY)
      frozen.current = true
      clearTimeout(thaw.current)
      thaw.current = window.setTimeout(() => {
        frozen.current = false
      }, 1000)
    }
    document.addEventListener('pointerdown', handlePointerDown, {
      capture: true,
    })
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown, {
        capture: true,
      })
      clearTimeout(thaw.current)
    }
  }, [pathname])

  // Applied once, on this mount, against whatever was stored before it. A
  // later scroll on this same mount updates `remembered` directly through
  // the effect above rather than through a value that would re-run this
  // one, so this intentionally runs only on mount.
  useEffect(() => {
    const stored = remembered.get(pathname)
    if (stored === undefined) return
    const frame = requestAnimationFrame(() => {
      document.documentElement.scrollTop = stored
    })
    return () => {
      cancelAnimationFrame(frame)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}
