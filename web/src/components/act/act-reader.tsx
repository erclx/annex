'use client'

import {
  Fragment,
  type KeyboardEvent,
  type ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'

import { SectionBar } from '@/components/act/section-bar'
import { ReadingList } from '@/components/answer/reading-list'
import { type CorpusVersion, VERSION_LABEL } from '@/components/shared/versions'
import {
  amendmentDiff,
  joinDiffSpans,
  sliceDiffSpans,
  trimDiffSpans,
} from '@/lib/corpus/amendment-diff'
import { pointName, type Segment, segmentsOf } from '@/lib/corpus/closest-point'
import {
  findProvision,
  type Provision,
  provisionsFor,
} from '@/lib/corpus/corpus'
import {
  type SectionSummary,
  type StepMode,
  stepTarget,
} from '@/lib/corpus/section-steps'

/** A provision's text as the blocks its own numbering cuts it into. */
interface Block {
  provision: Provision
  segments: Segment[]
}

interface Section {
  heading: Provision
  /** The paragraphs under the heading, or the heading's own text when it has none. */
  blocks: Block[]
  hasParagraphs: boolean
}

/** A provision the answer cites, as the pane's jump list names it. */
export interface CitedProvision {
  provisionId: string
  label: string
  /** On a refusal, whether search found the provision or the walk reached it. */
  reachedBy?: 'search' | 'walk'
}

export type PaneView = 'act' | 'walk'

/**
 * The docked pane's paper band pinned under the section bar's border, and how
 * far short of it a landing stops. A provision that scrolled all the way to
 * the bar would sit flush against its border with the previous one's tail
 * showing above, which the operator's third-use pass measured as the tint
 * touching the border at -0.5px. Stopping 12px short leaves a sliver of the
 * previous provision in the scroll container, and the band paints over it.
 */
const LANDING_BAND_HEIGHT = 12

/**
 * Whether the pane's list names what an answer cites or what a refusal read.
 * `canon/wireframes/answer.md` § Refused draws the second as one line opening
 * a list, rather than the answer's row of links.
 */
export type CitedAs = 'cited' | 'read'

/**
 * The flat provision list as headings with their paragraphs nested under them.
 *
 * Paragraph-level provisions are the visible reading unit under an article's
 * heading, per the plan's own measurement of what a static export can carry.
 * An article, annex or recital carrying no paragraph children falls back to
 * its own text, which is every annex and recital and the small minority of
 * articles with no numbered paragraphs.
 *
 * Every block is then cut at its own points and definitions, so an excerpt
 * that opened on Annex III, point 4(a) or Article 3, point (12) lands on a
 * block of that point's own rather than somewhere inside one 17 615-character
 * paragraph.
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

  const blockOf = (provision: Provision): Block => ({
    provision,
    segments: segmentsOf(provision.text),
  })

  return provisions
    .filter((provision) => provision.kind !== 'paragraph')
    .map((heading) => {
      const paragraphs = paragraphsByParent.get(heading.id) ?? []
      return {
        heading,
        blocks: (paragraphs.length > 0 ? paragraphs : [heading]).map(blockOf),
        hasParagraphs: paragraphs.length > 0,
      }
    })
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
 * The key of the block a landing marks: a point inside the open section when
 * one was asked for and exists there, and otherwise the open provision itself.
 *
 * A point is looked for across the whole section rather than inside the open
 * provision alone, since an excerpt citing Article 79 lands on paragraph 8,
 * which the Act renders as a provision of its own.
 */
function landingFor(
  section: Section | undefined,
  openId: string | null,
  openPoint: string | null,
): { key: string | null; pointLabel: string | null } {
  if (openId === null) return { key: null, pointLabel: null }
  if (openPoint && section) {
    for (const { provision, segments } of section.blocks) {
      const index = segments.findIndex(
        (segment) => segment.path.join('.') === openPoint,
      )
      if (index !== -1) {
        return {
          key: `${provision.id}#${index}`,
          pointLabel: pointName(provision.citation, segments[index].markers),
        }
      }
    }
  }
  return { key: openId, pointLabel: null }
}

/**
 * The Act itself, open to one provision, in one of two forms.
 *
 * Docked, at 1024 pixels and wider, it is a region of the one screen beside the
 * answer: always present, never modal, and scrolled inside itself so the answer
 * keeps its place. Below that width it is an overlay on the answer that opens
 * from a citation and closes back to it. `canon/wireframes/answer.md`
 * § Reading the Act draws both, and neither form is a route a visitor could
 * navigate to.
 *
 * The docked form carries the provisions the answer cites, the section bar that
 * steps through the whole Act or through those citations, and, when a walk is
 * supplied, a second view holding it. An answer's citations show as a row of
 * links and a refusal's as its reading list. The overlay carries none of the
 * three, since the answer it covers already lists every citation.
 */
export function ActReader({
  version,
  openId,
  openPoint = null,
  onClose,
  onVersionChange,
  docked = false,
  cited = [],
  citedAs = 'cited',
  onOpen,
  walk,
  view = 'act',
  onViewChange,
}: {
  version: CorpusVersion
  openId: string | null
  openPoint?: string | null
  onClose: () => void
  onVersionChange: (version: CorpusVersion) => void
  docked?: boolean
  cited?: readonly CitedProvision[]
  citedAs?: CitedAs
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
  const { key: landingKey, pointLabel } = landingFor(
    sections[openIndex],
    openId,
    openPoint,
  )

  // Bounded to the one open section's own blocks, each diffed against its own
  // counterpart, rather than the whole Act: an article's own text duplicates
  // its children's, at offsets a child's diff cannot read, so each child is
  // diffed under its own id instead of sliced out of its parent's.
  const highlightSectionIndex = openId !== null ? openIndex : null

  // The section in view follows the pane's scroll once the reader scrolls, and
  // starts again from the open provision whenever a landing replaces it.
  const [scrolled, setScrolled] = useState<{
    landing: string
    index: number
  } | null>(null)
  const landing = `${version}:${landingKey ?? ''}`
  const currentIndex =
    scrolled !== null && scrolled.landing === landing
      ? scrolled.index
      : openIndex

  const [stepMode, setStepMode] = useState<StepMode>('all')
  const citedPosition = cited.findIndex(
    (provision) => provision.provisionId === openId,
  )
  const citedIndex = citedPosition === -1 ? null : citedPosition

  const registerTarget = (key: string) => (element: HTMLElement | null) => {
    if (key === landingKey) targetRef.current = element
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
    // Docked, a provision lands under the section bar's paper band rather
    // than flush against its border, so the tinted provision reads as the
    // first thing under the bar with nothing of the previous one showing. The
    // operator's first-use pass rejected landing on the article's heading
    // with the provision lower down there, and the section bar above the
    // text names the article that heading would have named.
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
      body.scrollTop -
      (docked ? LANDING_BAND_HEIGHT : 0)
  }, [docked, isOpen, landingKey, showsWalk, version])

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
      landingKey={landingKey}
      registerTarget={registerTarget}
      highlightSectionIndex={highlightSectionIndex}
      version={version}
    />
  )

  if (docked) {
    return (
      <aside
        ref={paneRef}
        aria-label="The Act"
        className="sticky top-[var(--annex-bar-height,0px)] flex h-[calc(100vh-var(--annex-bar-height,0px))] flex-col border-l border-rule bg-surface"
      >
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-rule px-5 py-[10px]">
          {walk !== undefined ? (
            <div className="flex" role="group" aria-label="What the pane shows">
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
            <span className="text-[10.5px] text-muted">The Act</span>
          )}
          <ReadingVersion version={version} onVersionChange={onVersionChange} />
        </header>

        {showsWalk ? (
          <div className="flex-1 overflow-auto px-5 py-4">{walk}</div>
        ) : (
          <>
            {cited.length > 0 && citedAs === 'read' && (
              <div className="border-b border-rule-soft px-5 py-[10px]">
                <ReadingList
                  provisions={cited}
                  openId={openId}
                  onOpen={(provisionId) => onOpen?.(provisionId)}
                />
              </div>
            )}
            {cited.length > 0 && citedAs === 'cited' && (
              <nav
                aria-label="Cited in this answer"
                className="border-b border-rule-soft px-5 py-[10px]"
              >
                <span className="mb-1 block text-[10.5px] text-muted">
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
            <div className="relative flex-1 overflow-hidden">
              <div
                aria-hidden="true"
                data-testid="act-landing-band"
                className="pointer-events-none absolute inset-x-0 top-0 z-10 h-[12px] bg-surface"
              />
              <div
                ref={bodyRef}
                role="region"
                aria-label="Text of the Act"
                tabIndex={0}
                onScroll={handleBodyScroll}
                onKeyDown={handleBodyKeyDown}
                className="h-full -outline-offset-2 overflow-y-auto px-5 py-4"
              >
                {text}
              </div>
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
      aria-label={pointLabel ?? (target ? target.citation : 'The Act')}
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
          <ReadingVersion version={version} onVersionChange={onVersionChange} />

          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="rounded-md border border-rule px-[11px] py-[5px] text-[12px] text-muted"
          >
            Close
          </button>
        </header>

        <div className="border-b border-rule-soft bg-paper px-6 py-2 text-[10.5px] text-muted">
          {sections[openIndex]?.heading.citation}
        </div>

        <div ref={bodyRef} className="flex-1 overflow-y-auto px-6 py-6">
          {text}
        </div>
      </section>
    </div>
  )
}

const ACT_TEXT =
  'm-0 mb-[6px] font-[family-name:var(--font-serif)] text-[13px] leading-[1.5] text-act last:mb-0'

/**
 * The landed tint on a paragraph or a point, matching the rounded, padded
 * card a landed section already draws. The horizontal padding is canceled by
 * an equal negative margin so the tint bleeds outward without rewrapping a
 * line, and the vertical padding is left to grow the block, which is the
 * pick's own accepted cost of moving the paragraphs after it down 12px.
 */
const LANDED_TINT = 'rounded-[6px] bg-accent-soft px-[10px] py-[6px] -mx-[10px]'

function ActText({
  sections,
  landingKey,
  registerTarget,
  highlightSectionIndex,
  version,
}: {
  sections: readonly Section[]
  landingKey: string | null
  registerTarget: (key: string) => (element: HTMLElement | null) => void
  highlightSectionIndex: number | null
  version: CorpusVersion
}) {
  const landed = (key: string) => key === landingKey

  return sections.map((section, index) => (
    <article
      key={section.heading.id}
      ref={registerTarget(section.heading.id)}
      data-section-index={index}
      aria-current={landed(section.heading.id) ? 'location' : undefined}
      className={`mb-6 rounded-md p-[10px] last:mb-0 ${
        landed(section.heading.id) ? 'bg-accent-soft' : ''
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
      {section.blocks.map(({ provision, segments }) => {
        const diff =
          index === highlightSectionIndex ? amendmentDiff(provision.id) : null
        const highlightSpans =
          diff !== null && diff.status === 'changed' ? diff[version] : null
        const passages = segments.map((segment, segmentIndex) => {
          const key = `${provision.id}#${segmentIndex}`
          const end = segments[segmentIndex + 1]?.start ?? provision.text.length
          const passageSpans =
            highlightSpans !== null
              ? joinDiffSpans(
                  trimDiffSpans(
                    sliceDiffSpans(highlightSpans, segment.start, end),
                  ),
                )
              : null
          return (
            <p
              key={key}
              ref={registerTarget(key)}
              aria-current={landed(key) ? 'location' : undefined}
              className={`${ACT_TEXT} ${landed(key) ? LANDED_TINT : ''}`}
            >
              {segment.markers.length > 0 && (
                <span className="mr-[6px] font-sans text-[11px] font-semibold text-muted">
                  {pointName(provision.citation, segment.markers)}
                </span>
              )}
              {passageSpans !== null ? (
                <span>
                  {passageSpans.map((span, spanIndex) =>
                    span.changed ? (
                      <mark
                        key={spanIndex}
                        className="rounded-[2px] border-b-2 border-cite-rule-moved bg-warning-surface text-inherit"
                      >
                        {span.text}
                      </mark>
                    ) : (
                      <Fragment key={spanIndex}>{span.text}</Fragment>
                    ),
                  )}
                </span>
              ) : (
                <span>{segment.text}</span>
              )}
            </p>
          )
        })

        if (!section.hasParagraphs) return passages

        return (
          <div
            key={provision.id}
            ref={registerTarget(provision.id)}
            aria-current={landed(provision.id) ? 'location' : undefined}
            className={`mb-[6px] last:mb-0 ${
              landed(provision.id) ? LANDED_TINT : ''
            }`}
          >
            {passages}
          </div>
        )
      })}
    </article>
  ))
}

/**
 * Which text the Act is showing, and a link to the other.
 *
 * It swaps only what the reader shows and never re-asks, so it is drawn as a
 * line and a link rather than as the toggle the described-system card carries,
 * which the operator's second-use pass found drawn identically on two pieces of
 * state. The wording is the one the per-citation control already uses.
 */
function ReadingVersion({
  version,
  onVersionChange,
}: {
  version: CorpusVersion
  onVersionChange: (version: CorpusVersion) => void
}) {
  const other: CorpusVersion =
    version === 'original' ? 'consolidated' : 'original'

  return (
    <p className="m-0 flex flex-wrap items-baseline gap-x-2 text-[12px] text-muted">
      <span>{`Reading ${VERSION_LABEL[version]}`}</span>
      <button
        type="button"
        onClick={() => {
          onVersionChange(other)
        }}
        className="text-accent underline-offset-2 hover:underline"
      >
        {`Read ${VERSION_LABEL[other]}`}
      </button>
    </p>
  )
}

/**
 * The pane's view switch, drawn as tabs rather than as the segmented control
 * `top-bar.tsx`, `theme-toggle.tsx` and `section-bar.tsx` fill with `accent`.
 * The selected view reads in `ink` over a 2px `accent` bottom border, and the
 * unselected one stays `muted` over a transparent border of the same width,
 * so switching never shifts either label. The border also carries selection,
 * so it cannot double as a focus mark: this keeps no focus style of its own,
 * leaving the browser's native outline as the focus ring, the same as every
 * other bare button on this surface.
 */
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
      className={`border-b-2 px-[11px] py-[5px] text-[12px] ${
        active ? 'border-accent text-ink' : 'border-transparent text-muted'
      }`}
    >
      {children}
    </button>
  )
}
