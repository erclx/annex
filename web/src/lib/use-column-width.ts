'use client'

import { useSyncExternalStore } from 'react'

import {
  clampColumnWidth,
  COLUMN_DEFAULT,
  COLUMN_STORAGE_KEY,
  COLUMN_WIDTH_PROPERTY,
} from '@/lib/column-bounds'

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
  // A width stored from another tab reaches this one only through the storage
  // event, so the handler moves the grid as well as the handle reading it.
  function handleStorage() {
    publish(readWidth())
    onChange()
  }
  listeners.add(onChange)
  window.addEventListener('storage', handleStorage)
  return () => {
    listeners.delete(onChange)
    window.removeEventListener('storage', handleStorage)
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
 * before first paint by the script in `stored-choices.ts`, so the store and
 * that script read the same key and the same bounds.
 */
export function useColumnWidth(): {
  width: number
  setWidth: (width: number) => void
  resetWidth: () => void
} {
  const width = useSyncExternalStore(subscribe, readWidth, serverWidth)
  return { width, setWidth, resetWidth }
}
