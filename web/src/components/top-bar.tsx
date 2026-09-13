'use client'

import { useEffect, useRef } from 'react'

import { BrandMark } from '@/components/brand-mark'
import { ThemeToggle } from '@/components/theme-toggle'
import type { CorpusVersion } from '@/components/versions'

const REPOSITORY_URL = 'https://github.com/erclx/annex'
const EVALUATION_URL =
  'https://github.com/erclx/annex/blob/main/docs/evaluation.md'

/** Where the bar publishes its rendered height, for the docked pane to sit under. */
const BAR_HEIGHT_PROPERTY = '--annex-bar-height'

interface TopBarProps {
  version: CorpusVersion
  onVersionChange: (version: CorpusVersion) => void
  traversal: boolean
  onTraversalChange: (traversal: boolean) => void
  disabled: boolean
  traversalFixed?: boolean
  slim?: boolean
  showControls?: boolean
}

/**
 * The one persistent band: what this is, and the two controls that re-ask.
 *
 * Pinned to the top so the version toggle and the traversal switch stay in
 * reach while an answer is read. Past the described system it slims, dropping
 * the tagline and the links, which the operator's first-use pass picked over
 * both a full pinned bar and a bar carrying the question.
 *
 * The version control is a segmented pair whose active half is filled with the
 * accent, and the traversal control is a drawn switch rather than a checkbox.
 * The line under the switch says what it does: turning it off compares against
 * search alone on the live build, and on the deployed build it states the
 * recording was taken with traversal on, which is why the switch is held
 * inactive there rather than removed.
 *
 * `showControls` is false below 1024 pixels before anything is asked, where the
 * two controls sit under the description instead and the bar holds the brand.
 */
export function TopBar({
  version,
  onVersionChange,
  traversal,
  onTraversalChange,
  disabled,
  traversalFixed = false,
  slim = false,
  showControls = true,
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
    // sticky panes and the slim trigger read the height at mount.
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
      <div
        className={`flex w-full flex-wrap items-center justify-between gap-x-4 gap-y-2 px-6 lg:px-8 ${
          slim ? 'py-2' : 'py-4'
        }`}
      >
        <div className="flex min-w-0 items-center gap-2">
          <BrandMark size={slim ? 18 : 20} />
          <b className="text-[16px] font-semibold tracking-[-0.01em] text-ink">
            Annex
          </b>
          {!slim && (
            <span className="hidden truncate text-[12px] text-muted lg:inline">
              Which articles of the EU AI Act you have to read
            </span>
          )}
        </div>

        {showControls && (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            {!slim && (
              <nav className="flex items-center gap-3 text-[12px]">
                <a
                  href={REPOSITORY_URL}
                  className="text-accent hover:underline"
                >
                  Repository
                </a>
                <a
                  href={EVALUATION_URL}
                  className="text-accent hover:underline"
                >
                  Evaluation
                </a>
              </nav>
            )}

            <VersionToggle
              version={version}
              onVersionChange={onVersionChange}
              disabled={disabled}
            />

            <TraversalSwitch
              traversal={traversal}
              onTraversalChange={onTraversalChange}
              disabled={disabled}
              traversalFixed={traversalFixed}
            />
          </div>
        )}

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
  return (
    <div className="flex items-center gap-[7px] text-[12px] text-muted">
      <button
        type="button"
        role="switch"
        aria-checked={traversal}
        aria-label="Reference traversal"
        aria-describedby="traversal-hint"
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
        <span id="traversal-hint" className="text-[10.5px]">
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
