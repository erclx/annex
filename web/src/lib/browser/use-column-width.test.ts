import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { COLUMN_STORAGE_KEY } from '@/lib/browser/column-bounds'
import { useColumnWidth } from '@/lib/browser/use-column-width'

afterEach(() => {
  localStorage.clear()
})

describe('useColumnWidth', () => {
  it('should start at 640 pixels when nothing is stored', () => {
    const { result } = renderHook(() => useColumnWidth())

    expect(result.current.width).toBe(640)
  })

  it('should restore a width a reader stored before', () => {
    localStorage.setItem(COLUMN_STORAGE_KEY, '560')

    const { result } = renderHook(() => useColumnWidth())

    expect(result.current.width).toBe(560)
  })

  it('should ignore a stored value that is not a width', () => {
    localStorage.setItem(COLUMN_STORAGE_KEY, 'wide')

    const { result } = renderHook(() => useColumnWidth())

    expect(result.current.width).toBe(640)
  })

  it('should hold the column at 760 pixels at most', () => {
    const { result } = renderHook(() => useColumnWidth())

    act(() => {
      result.current.setWidth(900)
    })

    expect(result.current.width).toBe(760)
  })

  it('should hold the column at 480 pixels at least', () => {
    const { result } = renderHook(() => useColumnWidth())

    act(() => {
      result.current.setWidth(120)
    })

    expect(result.current.width).toBe(480)
  })

  it('should remember the width it was set to', () => {
    const { result } = renderHook(() => useColumnWidth())

    act(() => {
      result.current.setWidth(700)
    })

    expect(localStorage.getItem(COLUMN_STORAGE_KEY)).toBe('700')
  })

  it('should move the column when another tab stores a width', () => {
    renderHook(() => useColumnWidth())

    act(() => {
      localStorage.setItem(COLUMN_STORAGE_KEY, '580')
      window.dispatchEvent(
        new StorageEvent('storage', { key: COLUMN_STORAGE_KEY }),
      )
    })

    expect(
      document.documentElement.style.getPropertyValue('--annex-answer-width'),
    ).toBe('580px')
  })

  it('should return to 640 pixels and forget the stored width on reset', () => {
    localStorage.setItem(COLUMN_STORAGE_KEY, '520')
    const { result } = renderHook(() => useColumnWidth())

    act(() => {
      result.current.resetWidth()
    })

    expect(result.current.width).toBe(640)
    expect(localStorage.getItem(COLUMN_STORAGE_KEY)).toBeNull()
  })
})
