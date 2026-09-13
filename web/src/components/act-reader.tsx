'use client'

import {
  type KeyboardEvent,
  type ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'

import { SectionBar } from '@/components/section-bar'
import type { CorpusVersion } from '@/components/versions'
import { findProvision, type Provision, provisionsFor } from '@/lib/corpus'
import {
  type SectionSummary,
  type StepMode,
  stepTarget,
} from '@/lib/section-steps'

interface Section {
  heading: Provision
  paragraphs: Provision[]
}

/** A provision the answer cites, as the pane's jump list names it. */
export interface CitedProvision {
  provisionId: string
  label: string
}

export type PaneView = 'act' | 'walk'

/**
 * The flat provision list as headings with their paragraphs nested under them.
 *
 * Paragraph-level provisions are the visible reading unit under an article's
 * heading, per the plan's own measurement of what a static export can carry.
 * An article, annex or recital carrying no paragraph children falls back to
 * its own text, which is every annex and recital and the small minority of
 * articles with no numbered paragraphs.
 */
function sectionsFor(version: CorpusVersion): Section[] {
  const provisions = provisionsFor(version)
  const paragraphsByParent = new Map<string, Provision[]>()
  for (const provision of provisions) {
    if (provision.kind !== 'paragraph' || provision.parent_id === null) continue
    const siblings = paragraphsByParent.get(provision.parent_id) ?? []
    siblings.push(provision)
    paragraphsByParent.set(provision.parent_id, siblings)
  }

  return provisions
    .filter((provision) => provision.kind !== 'paragraph')
    .map((heading) => ({
      heading,
      paragraphs: paragraphsByParent.get(heading.id) ?? [],
    }))
}

/** The position of the section carrying a provision, which is its parent for a paragraph. */
function sectionIndexOf(
  sections: readonly SectionSummary[],
  version: CorpusVersion,
  provisionId: string | null,
): number {
  if (provisionId === null) return 0
  const provision = findProvision(version, provisionId)
  const headingId = provision?.parent_id ?? provisionId
  return Math.max(
    0,
    sections.findIndex((section) => section.id === headingId),
  )
}

/**
 * The Act itself, open to one provision, in one of two forms.
 *
 * Docked, at 1024 pixels and wider, it is a region of the one screen beside the
 * answer: always present, never modal, and scrolled inside itself so the answer
 * keeps its place. Below that width it is an overlay on the answer that opens
 * from a citation and closes back to it. `.claude/wireframes/answer.md`
 * § Reading the Act draws both, and neither form is a route a visitor could
 * navigate to.
 *
 * The docked form carries the provisions the answer cites as a jump list, the
 * section bar that steps through the whole Act or through those citations, and,
 * when a walk is supplied, a second view holding it. The overlay carries none of
 * the three, since the answer it covers already lists every citation.
 */
export function ActReader({
  version,
  openId,
  onClose,
  onVersionChange,
  docked = false,
  cited = [],
  onOpen,
  walk,
  view = 'act',
  onViewChange,
}: {
  version: CorpusVersion
  openId: string | null
  onClose: () => void
  onVersionChange: (version: CorpusVersion) => void
  docked?: boolean
  cited?: readonly CitedProvision[]
  onOpen?: (provisionId: string) => void
  walk?: ReactNode
  view?: PaneView
  onViewChange?: (view: PaneView) => void
}) {
  const paneRef = useRef<HTMLElement | null>(null)
  const bodyRef = useRef<HTMLDivElement | null>(null)
  const targetRef = useRef<HTMLElement | null>(null)
  const closeRef = useRef<HTMLButtonElement | null>(null)
  const triggerRef = useRef<HTMLElement | null>(null)
  const isOpen = openId !== null
  const isOverlayOpen = isOpen && !docked
  const showsWalk = docked && walk !== undefined && view === 'walk'

  const sections = useMemo(() => sectionsFor(version), [version])
  const summaries = useMemo<SectionSummary[]>(
    () =>
      sections.map(({ heading }) => ({
        id: heading.id,
        label: heading.citation,
        title: heading.title,
      })),
    [sections],
  )
  const openIndex = sectionIndexOf(summaries, version, openId)

  // The section in view follows the pane's scroll once the reader scrolls, and
  // starts again from the open provision whenever a landing replaces it.
  const [scrolled, setScrolled] = useState<{
    landing: string
    index: number
  } | null>(null)
  const landing = `${version}:${openId ?? ''}`
  const currentIndex =
    scrolled !== null && scrolled.landing === landing
      ? scrolled.index
      : openIndex

  const [stepMode, setStepMode] = useState<StepMode>('all')
  const citedPosition = cited.findIndex(
    (provision) => provision.provisionId === openId,
  )
  const citedIndex = citedPosition === -1 ? null : citedPosition

  const registerTarget =
    (provisionId: string) => (element: HTMLElement | null) => {
      if (provisionId === openId) targetRef.current = element
    }

  useEffect(() => {
    if (docked) return
    if (isOverlayOpen) {
      triggerRef.current = document.activeElement as HTMLElement | null
      closeRef.current?.focus()
    } else {
      triggerRef.current?.focus()
    }
  }, [docked, isOverlayOpen])

  useEffect(() => {
    if (!isOpen || showsWalk) return
    const target = targetRef.current
    if (!target) return
    const body = bodyRef.current
    if (!body) {
      target.scrollIntoView({ block: 'start' })
      return
    }
    // Both forms move only the Act's own scroll container. `scrollIntoView`
    // would also scroll the page behind a sticky pane and take the answer off
    // its place.
    //
    // Docked, a provision lands flush at the top of the text, so the tinted
    // provision is the first thing read. The operator's first-use pass rejected
    // landing on the article's heading with the provision lower down there,
    // and the section bar above the text names the article that heading would
    // have named.
    //
    // The overlay carries no section bar, so a paragraph read there without
    // its article names nothing. It lands on the article's heading whenever the
    // heading and the whole paragraph fit in view together, and on the
    // paragraph itself only when they do not.
    const article = docked ? null : target.closest('article')
    const anchor =
      article &&
      article !== target &&
      target.getBoundingClientRect().bottom -
        article.getBoundingClientRect().top <=
        body.clientHeight
        ? article
        : target
    body.scrollTop =
      anchor.getBoundingClientRect().top -
      body.getBoundingClientRect().top +
      body.scrollTop
  }, [docked, isOpen, openId, showsWalk, version])

  useEffect(() => {
    if (!isOverlayOpen) return
    function handleKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOverlayOpen, onClose])

  // A sticky pane one viewport tall starts below the described system, so its
  // last stretch sat under the fold until the page scrolled. The pane's height
  // follows the space between its own top and the bottom of the viewport.
  useEffect(() => {
    if (!docked) return
    const pane = paneRef.current
    if (!pane) return
    let frame = 0
    function fit() {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        if (!pane) return
        const top = Math.max(0, pane.getBoundingClientRect().top)
        pane.style.height = `${window.innerHeight - top}px`
      })
    }
    fit()
    window.addEventListener('scroll', fit, { passive: true })
    window.addEventListener('resize', fit)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', fit)
      window.removeEventListener('resize', fit)
    }
  }, [docked])

  function handleBodyScroll() {
    const body = bodyRef.current
    if (!body) return
    const top = body.getBoundingClientRect().top + 12
    let index = 0
    for (const article of body.querySelectorAll<HTMLElement>(
      'article[data-section-index]',
    )) {
      if (article.getBoundingClientRect().top > top) break
      index = Number(article.dataset.sectionIndex)
    }
    if (index !== currentIndex) setScrolled({ landing, index })
  }

  function handleBodyKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
    const target = stepTarget(
      {
        sections: summaries,
        currentIndex,
        cited,
        citedIndex,
        mode: stepMode,
      },
      event.key === 'ArrowRight' ? 1 : -1,
    )
    if (target === null) return
    event.preventDefault()
    onOpen?.(target)
  }

  const text = (
    <ActText
      sections={sections}
      openId={openId}
      registerTarget={registerTarget}
    />
  )

  if (docked) {
    return (
      <aside
        ref={paneRef}
        aria-label="The Act"
        className="sticky top-[var(--annex-bar-height,0px)] flex h-screen flex-col border-l border-rule bg-surface"
      >
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-rule px-5 py-[10px]">
          {walk !== undefined ? (
            <div
              className="flex overflow-hidden rounded-md border border-rule"
              role="group"
              aria-label="What the pane shows"
            >
              <ViewButton
                active={view === 'act'}
                onClick={() => onViewChange?.('act')}
              >
                The Act
              </ViewButton>
              <ViewButton
                active={view === 'walk'}
                onClick={() => onViewChange?.('walk')}
              >
                The walk
              </ViewButton>
            </div>
          ) : (
            <span className="font-mono text-[10.5px] tracking-[0.08em] text-muted uppercase">
              The Act
            </span>
          )}
          <VersionToggle version={version} onVersionChange={onVersionChange} />
        </header>

        {showsWalk ? (
          <div className="flex-1 overflow-auto px-5 py-4">{walk}</div>
        ) : (
          <>
            {cited.length > 0 && (
              <nav
                aria-label="Cited in this answer"
                className="border-b border-rule-soft px-5 py-[10px]"
              >
                <span className="mb-1 block font-mono text-[10.5px] tracking-[0.08em] text-muted uppercase">
                  Cited in this answer
                </span>
                <div className="flex flex-wrap gap-x-[14px] gap-y-1">
                  {cited.map((provision) => (
                    <button
                      key={provision.provisionId}
                      type="button"
                      aria-current={
                        provision.provisionId === openId ? 'true' : undefined
                      }
                      onClick={() => onOpen?.(provision.provisionId)}
                      className={`text-[12px] underline-offset-2 hover:underline ${
                        provision.provisionId === openId
                          ? 'font-semibold text-ink'
                          : 'text-accent'
                      }`}
                    >
                      {provision.label}
                    </button>
                  ))}
                </div>
              </nav>
            )}
            <SectionBar
              sections={summaries}
              currentIndex={currentIndex}
              cited={cited}
              citedIndex={citedIndex}
              mode={stepMode}
              onModeChange={setStepMode}
              onGo={(provisionId) => onOpen?.(provisionId)}
            />
            <div
              ref={bodyRef}
              role="region"
              aria-label="Text of the Act"
              tabIndex={0}
              onScroll={handleBodyScroll}
              onKeyDown={handleBodyKeyDown}
              className="flex-1 overflow-y-auto px-5 py-4"
            >
              {text}
            </div>
          </>
        )}
      </aside>
    )
  }

  if (!isOpen) return null

  const target = findProvision(version, openId)

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={target ? target.citation : 'The Act'}
      className="fixed inset-0 z-30 flex justify-end bg-ink/40"
    >
      <button
        type="button"
        aria-label="Close the reading panel"
        onClick={onClose}
        className="absolute inset-0"
      />

      <section className="relative flex h-full w-full max-w-2xl flex-col bg-paper">
        <header className="flex items-center justify-between gap-4 border-b border-rule bg-surface px-6 py-4">
          <VersionToggle version={version} onVersionChange={onVersionChange} />

          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="rounded-md border border-rule px-[11px] py-[5px] text-[12px] text-muted"
          >
            Close
          </button>
        </header>

        <div ref={bodyRef} className="flex-1 overflow-y-auto px-6 py-6">
          {text}
        </div>
      </section>
    </div>
  )
}

function ActText({
  sections,
  openId,
  registerTarget,
}: {
  sections: readonly Section[]
  openId: string | null
  registerTarget: (provisionId: string) => (element: HTMLElement | null) => void
}) {
  return sections.map((section, index) => (
    <article
      key={section.heading.id}
      ref={registerTarget(section.heading.id)}
      data-section-index={index}
      className={`mb-6 rounded-md p-[10px] last:mb-0 ${
        section.heading.id === openId ? 'bg-accent-soft' : ''
      }`}
    >
      <h2 className="mb-1 text-[14px] font-semibold text-ink">
        {section.heading.citation}
        {section.heading.title && (
          <span className="ml-2 font-normal text-muted">
            {section.heading.title}
          </span>
        )}
      </h2>
      {section.paragraphs.length > 0 ? (
        section.paragraphs.map((paragraph) => (
          <p
            key={paragraph.id}
            ref={registerTarget(paragraph.id)}
            className={`m-0 mb-[6px] font-[family-name:var(--font-serif)] text-[13px] leading-[1.5] text-act last:mb-0 ${
              paragraph.id === openId ? 'bg-accent-soft' : ''
            }`}
          >
            {paragraph.text}
          </p>
        ))
      ) : (
        <p className="m-0 font-[family-name:var(--font-serif)] text-[13px] leading-[1.5] text-act">
          {section.heading.text}
        </p>
      )}
    </article>
  ))
}

function VersionToggle({
  version,
  onVersionChange,
}: {
  version: CorpusVersion
  onVersionChange: (version: CorpusVersion) => void
}) {
  return (
    <div
      className="flex overflow-hidden rounded-md border border-rule bg-transparent"
      role="group"
      aria-label="Which text to read"
    >
      <VersionButton
        active={version === 'original'}
        onClick={() => {
          onVersionChange('original')
        }}
      >
        Original
      </VersionButton>
      <VersionButton
        active={version === 'consolidated'}
        onClick={() => {
          onVersionChange('consolidated')
        }}
      >
        Amended 27 Jul 2026
      </VersionButton>
    </div>
  )
}

function VersionButton({
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
      className={`px-[11px] py-[5px] text-[12px] ${
        active ? 'bg-accent text-paper' : 'text-muted'
      }`}
    >
      {children}
    </button>
  )
}

function ViewButton({
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
      className={`px-[11px] py-[5px] text-[12px] ${
        active ? 'bg-ink text-paper' : 'text-muted'
      }`}
    >
      {children}
    </button>
  )
}
