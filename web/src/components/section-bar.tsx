'use client'

import { type ReactNode, useState } from 'react'

import {
  jumpTarget,
  type StepMode,
  type StepState,
  stepTarget,
} from '@/lib/section-steps'

interface SectionBarProps extends StepState {
  onModeChange: (mode: StepMode) => void
  onGo: (provisionId: string) => void
}

/**
 * The strip over the Act's text: which section is in view, where that sits in
 * the whole, and the controls that move by section or by citation.
 *
 * Picked as arm 3d in `.canon/review/first-use/operator-pass.md`. It names the
 * article or cited paragraph a landing lands on, which is what keeps the
 * heading's context once a provision lands flush at the top of the text rather
 * than below its article's heading.
 */
export function SectionBar({
  sections,
  currentIndex,
  cited,
  citedIndex,
  mode,
  onModeChange,
  onGo,
}: SectionBarProps) {
  const [jump, setJump] = useState('')
  const state = { sections, currentIndex, cited, citedIndex, mode }
  const previous = stepTarget(state, -1)
  const next = stepTarget(state, 1)
  const section = sections.at(currentIndex)
  const citedInView = citedIndex === null ? undefined : cited.at(citedIndex)
  const citing = mode === 'cited'

  const name = citing ? (citedInView?.label ?? section?.label) : section?.label
  const count = citing
    ? `${citedIndex === null ? '–' : citedIndex + 1} of ${cited.length} cited`
    : `${currentIndex + 1} of ${sections.length}`
  const noun = citing ? 'cited provision' : 'section'

  return (
    <div
      data-testid="section-bar"
      className="flex items-center gap-2 border-b border-rule bg-surface px-3 py-[6px]"
    >
      <StepButton label={`Previous ${noun}`} target={previous} onGo={onGo}>
        ‹
      </StepButton>
      <p
        className="m-0 min-w-0 flex-1 truncate text-[13px]"
        title={section ? `${name ?? ''} ${section.title}` : undefined}
      >
        <b className="font-semibold text-ink">{name}</b>{' '}
        <span className="text-muted">{section?.title}</span>
      </p>
      <span className="shrink-0 font-mono text-[11px] text-muted">{count}</span>
      {cited.length > 0 && (
        <div
          className="flex shrink-0 overflow-hidden rounded-md border border-rule"
          role="group"
          aria-label="What the arrows step through"
        >
          <ModeButton
            active={!citing}
            onClick={() => {
              onModeChange('all')
            }}
          >
            Whole Act
          </ModeButton>
          <ModeButton
            active={citing}
            onClick={() => {
              onModeChange('cited')
            }}
          >
            Cited
          </ModeButton>
        </div>
      )}
      <input
        type="text"
        aria-label="Go to an article or annex"
        placeholder="Go to"
        value={jump}
        onChange={(event) => {
          setJump(event.target.value)
        }}
        onKeyDown={(event) => {
          if (event.key !== 'Enter') return
          event.preventDefault()
          const target = jumpTarget(sections, jump)
          if (target === null) return
          onGo(target)
          setJump('')
        }}
        className="w-[64px] shrink-0 rounded-md border border-rule bg-paper px-[7px] py-[3px] font-mono text-[12px] text-ink placeholder:text-muted"
      />
      <StepButton label={`Next ${noun}`} target={next} onGo={onGo}>
        ›
      </StepButton>
    </div>
  )
}

function StepButton({
  label,
  target,
  onGo,
  children,
}: {
  label: string
  target: string | null
  onGo: (provisionId: string) => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={target === null}
      onClick={() => {
        if (target !== null) onGo(target)
      }}
      className="h-[26px] w-[28px] shrink-0 rounded-md border border-rule bg-surface text-[14px] leading-none text-ink disabled:cursor-not-allowed disabled:opacity-40"
    >
      {children}
    </button>
  )
}

function ModeButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`px-[8px] py-[3px] text-[11.5px] ${
        active ? 'bg-accent text-paper' : 'text-muted'
      }`}
    >
      {children}
    </button>
  )
}
