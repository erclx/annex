import { act, render, screen } from '@testing-library/react'
import { useRef } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useScrolledPast } from '@/lib/use-scrolled-past'

type Report = (entries: Partial<IntersectionObserverEntry>[]) => void

let report: Report = () => undefined
let observedMargin: string | undefined

class FakeObserver {
  constructor(callback: Report, options?: IntersectionObserverInit) {
    report = callback
    observedMargin = options?.rootMargin
  }
  observe() {
    return undefined
  }
  disconnect() {
    return undefined
  }
}

function Probe() {
  const marker = useRef<HTMLDivElement | null>(null)
  const isPast = useScrolledPast(marker)
  return (
    <>
      <div ref={marker} />
      <p>{isPast ? 'past' : 'not past'}</p>
    </>
  )
}

beforeEach(() => {
  vi.stubGlobal('IntersectionObserver', FakeObserver)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('useScrolledPast', () => {
  it('should read as not past before the marker has scrolled away', () => {
    render(<Probe />)

    expect(screen.getByText('not past')).toBeInTheDocument()
  })

  it('should read as past once the marker leaves above the pinned bar', () => {
    render(<Probe />)

    act(() => {
      report([
        {
          isIntersecting: false,
          boundingClientRect: { top: -40 } as DOMRectReadOnly,
        },
      ])
    })

    expect(screen.getByText('past')).toBeInTheDocument()
  })

  it('should not read as past for a marker still below the fold', () => {
    render(<Probe />)

    act(() => {
      report([
        {
          isIntersecting: false,
          boundingClientRect: { top: 1200 } as DOMRectReadOnly,
        },
      ])
    })

    expect(screen.getByText('not past')).toBeInTheDocument()
  })

  it('should measure against the height the pinned bar published', () => {
    document.documentElement.style.setProperty('--annex-bar-height', '57px')

    render(<Probe />)

    expect(observedMargin).toBe('-57px 0px 0px 0px')
    document.documentElement.style.removeProperty('--annex-bar-height')
  })

  it('should assume no bar, as the sticky panes do, when none is published', () => {
    render(<Probe />)

    expect(observedMargin).toBe('-0px 0px 0px 0px')
  })
})
