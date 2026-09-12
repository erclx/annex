'use client'

import { useEffect, useRef } from 'react'

import type { CorpusVersion } from '@/components/versions'
import { findProvision, type Provision, provisionsFor } from '@/lib/corpus'

interface Section {
  heading: Provision
  paragraphs: Provision[]
}

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
 * The Act itself, open to one provision, over the answer rather than a route.
 *
 * `.claude/wireframes/answer.md` states one surface, no second screen, no
 * navigation. This panel is an overlay on that one surface rather than an
 * exception to it: it opens from a citation, closes back to the answer, and
 * nothing here is a route a visitor could bookmark or navigate to directly.
 */
export function ActReader({
  version,
  openId,
  onClose,
  onVersionChange,
}: {
  version: CorpusVersion
  openId: string | null
  onClose: () => void
  onVersionChange: (version: CorpusVersion) => void
}) {
  const targetRef = useRef<HTMLElement | null>(null)
  const closeRef = useRef<HTMLButtonElement | null>(null)
  const triggerRef = useRef<HTMLElement | null>(null)
  const isOpen = openId !== null

  const registerTarget =
    (provisionId: string) => (element: HTMLElement | null) => {
      if (provisionId === openId) targetRef.current = element
    }

  useEffect(() => {
    if (isOpen) {
      triggerRef.current = document.activeElement as HTMLElement | null
      closeRef.current?.focus()
    } else {
      triggerRef.current?.focus()
    }
  }, [isOpen])

  useEffect(() => {
    if (isOpen) targetRef.current?.scrollIntoView({ block: 'start' })
  }, [isOpen, version])

  useEffect(() => {
    if (!isOpen) return
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onClose])

  if (!isOpen || openId === null) return null

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

          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="rounded-md border border-rule px-[11px] py-[5px] text-[12px] text-muted"
          >
            Close
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-6 py-6">
          {sectionsFor(version).map((section) => (
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
          ))}
        </div>
      </section>
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
  children: React.ReactNode
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
