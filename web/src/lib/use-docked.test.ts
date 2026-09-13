import { renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { useDocked } from '@/lib/use-docked'

function stubViewport(isWide: boolean) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({
      matches: isWide && query === '(min-width: 1024px)',
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  )
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('useDocked', () => {
  it('should dock the pane at 1024 pixels and wider', () => {
    stubViewport(true)

    const { result } = renderHook(() => useDocked())

    expect(result.current).toBe(true)
  })

  it('should keep the overlay below 1024 pixels', () => {
    stubViewport(false)

    const { result } = renderHook(() => useDocked())

    expect(result.current).toBe(false)
  })
})
