'use client'

import { type ReactNode, useEffect, useRef } from 'react'

import type { CorpusVersion } from '@/components/versions'
import { findProvision, type Provision, provisionsFor } from '@/lib/corpus'

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
 * The docked form carries the provisions the answer cites as a jump list and,
 * when a walk is supplied, a second view holding it. The overlay carries
 * neither, since the answer it covers already lists every citation.
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
  const bodyRef = useRef<HTMLDivElement | null>(null)
  const targetRef = useRef<HTMLElement | null>(null)
  const closeRef = useRef<HTMLButtonElement | null>(null)
  const triggerRef = useRef<HTMLElement | null>(null)
  const isOpen = openId !== null
  const isOverlayOpen = isOpen && !docked
  const showsWalk = docked && walk !== undefined && view === 'walk'

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
    // Docked, only the pane's own container moves. `scrollIntoView` would also
    // scroll the page behind a sticky pane and take the answer off its place.
    if (docked && bodyRef.current) {
      const body = bodyRef.current
      // A paragraph means nothing without the article carrying it, so the pane
      // lands on that article's heading whenever the heading and the whole
      // paragraph fit in view together, and on the paragraph itself only when
      // they do not. Testing the article's full height instead sent every
      // paragraph of a long article to the paragraph's own top, heading lost.
      const article = target.closest('article')
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
      return
    }
    target.scrollIntoView({ block: 'start' })
  }, [docked, isOpen, openId, showsWalk, version])

  useEffect(() => {
    if (!isOverlayOpen) return
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOverlayOpen, onClose])

  const text = (
    <ActText
      version={version}
      openId={openId}
      registerTarget={registerTarget}
    />
  )

  if (docked) {
    return (
      <aside
        aria-label="The Act"
        className="sticky top-0 flex h-screen flex-col border-l border-rule bg-surface"
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
            <div ref={bodyRef} className="flex-1 overflow-y-auto px-5 py-4">
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
      className="fixed inset-0 z-10 flex justify-end bg-ink/40"
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

        <div className="flex-1 overflow-y-auto px-6 py-6">{text}</div>
      </section>
    </div>
  )
}

function ActText({
  version,
  openId,
  registerTarget,
}: {
  version: CorpusVersion
  openId: string | null
  registerTarget: (provisionId: string) => (element: HTMLElement | null) => void
}) {
  return sectionsFor(version).map((section) => (
    <article
      key={section.heading.id}
      ref={registerTarget(section.heading.id)}
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
