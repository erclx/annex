'use client'

import Link from 'next/link'
import { useEffect, useId, useRef } from 'react'

import { BrandMark } from '@/components/frame/brand-mark'
import { ThemeToggle } from '@/components/frame/theme-toggle'
import type { CorpusVersion } from '@/components/shared/versions'

const REPOSITORY_URL = 'https://github.com/erclx/annex'
const EVALUATION_URL =
  'https://github.com/erclx/annex/blob/main/docs/evaluation.md'

/** Where the bar publishes its rendered height, for the docked pane to sit under. */
const BAR_HEIGHT_PROPERTY = '--annex-bar-height'

interface TopBarProps {
  traversal: boolean
  onTraversalChange: (traversal: boolean) => void
  disabled: boolean
  traversalFixed?: boolean
  showTraversal?: boolean
}

/**
 * The one persistent band: what this is, where its source lives, and the
 * traversal switch once an answer is on screen at 1024 pixels and wider.
 *
 * Pinned to the top at one full height in every state. The operator's
 * second-use pass reversed the slimming bar the first pass picked, so the
 * tagline and the links never drop out.
 *
 * The mark and the name link to `/`, the landing page, as a client navigation,
 * so the description a reader typed survives in the handoff the root layout
 * holds.
 *
 * The bar carries no version toggle. On `/` the composer holds it and on `/ask`
 * the described-system card does, so no screen draws two controls
 * carrying the same two labels. The line under the switch says what it does:
 * turning it off compares against search alone on the live build, and on the
 * deployed build it states the recording was taken with traversal on, which is
 * why the switch is held inactive there rather than removed.
 */
export function TopBar({
  traversal,
  onTraversalChange,
  disabled,
  traversalFixed = false,
  showTraversal = true,
}: TopBarProps) {
  const barRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    const bar = barRef.current
    if (!bar || typeof ResizeObserver === 'undefined') return
    const root = document.documentElement
    function publishHeight() {
      if (bar)
        root.style.setProperty(BAR_HEIGHT_PROPERTY, `${bar.offsetHeight}px`)
    }
    // `observe()` schedules its first callback rather than running it, and the
    // sticky panes and the column handle read the height at mount.
    publishHeight()
    const observer = new ResizeObserver(publishHeight)
    observer.observe(bar)
    return () => {
      observer.disconnect()
      root.style.removeProperty(BAR_HEIGHT_PROPERTY)
    }
  }, [])

  return (
    <header
      ref={barRef}
      className="sticky top-0 z-20 border-b border-rule bg-surface"
    >
      <div className="flex w-full flex-wrap items-center justify-between gap-x-4 gap-y-2 px-6 py-4 lg:px-8">
        <div className="flex min-w-0 items-center gap-2">
          <Link href="/" className="flex items-center gap-2 text-ink">
            <BrandMark size={20} />
            <b className="text-[16px] font-semibold tracking-[-0.01em]">
              Annex
            </b>
          </Link>
          <span className="hidden truncate text-[12px] text-muted lg:inline">
            Which articles of the EU AI Act you have to read
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <nav className="flex items-center gap-3 text-[12px]">
            <a href={REPOSITORY_URL} className="text-accent hover:underline">
              Repository
            </a>
            <a href={EVALUATION_URL} className="text-accent hover:underline">
              Evaluation
            </a>
          </nav>

          {showTraversal && (
            <TraversalSwitch
              traversal={traversal}
              onTraversalChange={onTraversalChange}
              disabled={disabled}
              traversalFixed={traversalFixed}
            />
          )}
        </div>

        <ThemeToggle />
      </div>
    </header>
  )
}

export function VersionToggle({
  version,
  onVersionChange,
  disabled,
}: {
  version: CorpusVersion
  onVersionChange: (version: CorpusVersion) => void
  disabled: boolean
}) {
  return (
    <div
      className="flex overflow-hidden rounded-md border border-rule bg-transparent"
      role="group"
      aria-label="Which text to read against"
    >
      <VersionButton
        active={version === 'original'}
        disabled={disabled}
        onClick={() => {
          onVersionChange('original')
        }}
      >
        Original
      </VersionButton>
      <VersionButton
        active={version === 'consolidated'}
        disabled={disabled}
        onClick={() => {
          onVersionChange('consolidated')
        }}
      >
        Amended 27 Jul 2026
      </VersionButton>
    </div>
  )
}

export function TraversalSwitch({
  traversal,
  onTraversalChange,
  disabled,
  traversalFixed,
}: {
  traversal: boolean
  onTraversalChange: (traversal: boolean) => void
  disabled: boolean
  traversalFixed: boolean
}) {
  // One switch renders at a time today, but the composer, the card and the bar
  // each draw one, so the hint's id is derived rather than fixed.
  const hintId = useId()

  return (
    <div className="flex items-center gap-[7px] text-[12px] text-muted">
      <button
        type="button"
        role="switch"
        aria-checked={traversal}
        aria-label="Reference traversal"
        aria-describedby={hintId}
        disabled={disabled || traversalFixed}
        onClick={() => {
          onTraversalChange(!traversal)
        }}
        className={`relative h-[17px] w-[30px] shrink-0 rounded-full disabled:cursor-not-allowed disabled:opacity-60 ${
          traversal ? 'bg-accent' : 'bg-rule'
        }`}
      >
        <span
          className={`absolute top-[2px] size-[13px] rounded-full bg-paper ${
            traversal ? 'right-[2px]' : 'left-[2px]'
          }`}
        />
      </button>
      <span className="flex flex-col leading-[1.3]">
        <span>Reference traversal</span>
        <span id={hintId} className="text-[10.5px]">
          {traversalFixed
            ? 'Recorded with traversal on'
            : 'Turn off to compare against search alone'}
        </span>
      </span>
    </div>
  )
}

function VersionButton({
  active,
  disabled,
  onClick,
  children,
}: {
  active: boolean
  disabled: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
      className={`px-[11px] py-[5px] text-[12px] disabled:cursor-not-allowed disabled:opacity-60 ${
        active ? 'bg-accent text-paper' : 'text-muted'
      }`}
    >
      {children}
    </button>
  )
}
