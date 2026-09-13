'use client'

import { useSyncExternalStore } from 'react'

export const COLUMN_STORAGE_KEY = 'annex-column-width'
export const COLUMN_MIN = 480
export const COLUMN_MAX = 760
export const COLUMN_DEFAULT = 640

export function clampColumnWidth(width: number): number {
  return Math.round(Math.min(COLUMN_MAX, Math.max(COLUMN_MIN, width)))
}

/**
 * The width kept for this page view when the browser refuses to store it.
 *
 * A private window or blocked site data throws on the write, and a handle that
 * stopped moving there would read as broken. Storage stays the source whenever
 * it can be read, so this only ever holds a width nothing else could keep.
 */
let fallbackWidth: number | null = null

const listeners = new Set<() => void>()

function notify() {
  listeners.forEach((listener) => {
    listener()
  })
}

function subscribe(onChange: () => void) {
  listeners.add(onChange)
  window.addEventListener('storage', onChange)
  return () => {
    listeners.delete(onChange)
    window.removeEventListener('storage', onChange)
  }
}

function readWidth(): number {
  try {
    const raw = localStorage.getItem(COLUMN_STORAGE_KEY)
    if (raw === null) return fallbackWidth ?? COLUMN_DEFAULT
    const value = Number(raw)
    return Number.isFinite(value) ? clampColumnWidth(value) : COLUMN_DEFAULT
  } catch {
    return fallbackWidth ?? COLUMN_DEFAULT
  }
}

function serverWidth(): number {
  return COLUMN_DEFAULT
}

/**
 * Where the layout reads the width from. The pre-paint script in `layout.tsx`
 * writes the stored value here before the page draws, and every change lands
 * here too, so the columns never render at one width and move to another.
 */
export const COLUMN_WIDTH_PROPERTY = '--annex-answer-width'

function publish(width: number) {
  document.documentElement.style.setProperty(
    COLUMN_WIDTH_PROPERTY,
    `${width}px`,
  )
}

function setWidth(width: number) {
  const next = clampColumnWidth(width)
  try {
    localStorage.setItem(COLUMN_STORAGE_KEY, String(next))
    fallbackWidth = null
  } catch {
    fallbackWidth = next
  }
  publish(next)
  notify()
}

function resetWidth() {
  try {
    localStorage.removeItem(COLUMN_STORAGE_KEY)
  } catch {
    // Nothing was stored where storage is refused, so there is nothing to forget.
  }
  fallbackWidth = null
  publish(COLUMN_DEFAULT)
  notify()
}

/**
 * The answer column's width, remembered per viewer.
 *
 * Read through a store rather than copied into state by an effect, the pattern
 * `theme-toggle.tsx` already follows for the same reason. The value is applied
 * before first paint by the script in `layout.tsx`, so the store and that
 * script read the same key.
 */
export function useColumnWidth(): {
  width: number
  setWidth: (width: number) => void
  resetWidth: () => void
} {
  const width = useSyncExternalStore(subscribe, readWidth, serverWidth)
  return { width, setWidth, resetWidth }
}
