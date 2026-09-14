'use client'

import { type KeyboardEvent, useEffect, useRef, useState } from 'react'

import type { CitedProvision } from '@/components/act/act-reader'

const CITATION_NUMBER =
  /^(article|annex|recital)\s+(\d+|[ivxlc]+)(?![\p{L}\p{N}])/iu
const QUERY_NUMBER = /^(?:(article|annex|recital)\s+)?(\d+|[ivxlc]+)$/i

/**
 * Whether a citation answers a filter.
 *
 * A bare number or numeral matches exactly, so `Article 5` finds Article 5 and
 * its paragraphs and never Articles 53 to 56, and `II` finds Annex II and not
 * Annex III. Anything longer, such as `Article 5(1)`, matches as the start of
 * the citation.
 */
function matchesFilter(label: string, filter: string): boolean {
  const query = filter.trim().replace(/\s+/g, ' ')
  if (query === '') return true

  const wanted = QUERY_NUMBER.exec(query)
  if (!wanted) return label.toLowerCase().startsWith(query.toLowerCase())

  const cited = CITATION_NUMBER.exec(label)
  if (!cited) return false
  const [, wantedKind, wantedNumber] = wanted
  const [, citedKind, citedNumber] = cited
  return (
    (wantedKind === undefined ||
      wantedKind.toLowerCase() === citedKind.toLowerCase()) &&
    wantedNumber.toLowerCase() === citedNumber.toLowerCase()
  )
}

/**
 * What a refusal read, behind one line rather than as a wall of links.
 *
 * Picked in the operator's first-use pass as L8, arm 3. The largest recorded
 * refusal consulted 22 provisions and the billboard refusal on the live build
 * 33, which printed as links put five rows between the pane's top and the Act.
 * One line keeps the Act's text directly under it, and the list opens over the
 * text, filters by citation number, and says of each row whether search found
 * it or the walk reached it, since that is the difference between what matched
 * the question and what the Act's own references led to.
 */
export function ReadingList({
  provisions,
  openId,
  onOpen,
}: {
  provisions: readonly CitedProvision[]
  openId: string | null
  onOpen: (provisionId: string) => void
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [filter, setFilter] = useState('')
  const controlRef = useRef<HTMLButtonElement | null>(null)
  const filterRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (isOpen) filterRef.current?.focus()
  }, [isOpen])

  function close() {
    setIsOpen(false)
    setFilter('')
    controlRef.current?.focus()
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== 'Escape') return
    event.stopPropagation()
    close()
  }

  const rows = provisions.filter((provision) =>
    matchesFilter(provision.label, filter),
  )
  const count = `${provisions.length} ${
    provisions.length === 1 ? 'provision' : 'provisions'
  } read before refusing`

  return (
    <div className="relative">
      <button
        ref={controlRef}
        type="button"
        aria-expanded={isOpen}
        onClick={() => {
          if (isOpen) close()
          else setIsOpen(true)
        }}
        className="flex w-full items-center justify-between rounded-md border border-rule px-[10px] py-[6px] text-left text-[12.5px] text-ink hover:border-accent"
      >
        {count}
        <span aria-hidden="true" className="text-[11.5px] text-muted">
          {isOpen ? 'Close list ▴' : 'Open list ▾'}
        </span>
      </button>

      {isOpen && (
        <div
          onKeyDown={handleKeyDown}
          className="absolute inset-x-0 top-full z-10 mt-1 flex max-h-[340px] flex-col gap-2 rounded-lg border border-rule bg-surface p-[10px] shadow-lg"
        >
          <input
            ref={filterRef}
            type="search"
            value={filter}
            onChange={(event) => {
              setFilter(event.target.value)
            }}
            aria-label="Filter by article or annex number"
            placeholder="Article 5"
            className="rounded-md border border-rule bg-paper px-2 py-[5px] text-[12.5px] text-ink placeholder:text-muted"
          />
          {rows.length > 0 ? (
            <ul
              aria-label="Provisions read"
              className="m-0 flex list-none flex-col overflow-y-auto p-0"
            >
              {rows.map((provision) => (
                <li key={provision.provisionId}>
                  <button
                    type="button"
                    aria-current={
                      provision.provisionId === openId ? 'true' : undefined
                    }
                    onClick={() => {
                      onOpen(provision.provisionId)
                    }}
                    className={`flex w-full justify-between rounded px-[6px] py-1 text-left text-[12.5px] hover:bg-accent-soft ${
                      provision.provisionId === openId
                        ? 'font-semibold text-ink'
                        : 'text-accent'
                    }`}
                  >
                    <span>{provision.label}</span>
                    {provision.reachedBy && (
                      <span className="text-[11px] font-normal text-muted">
                        {provision.reachedBy}
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="m-0 px-[6px] text-[12.5px] text-muted">
              Nothing read before refusing matches that number.{' '}
              <button
                type="button"
                onClick={() => {
                  setFilter('')
                  filterRef.current?.focus()
                }}
                className="text-accent underline underline-offset-2"
              >
                Clear filter
              </button>
            </p>
          )}
        </div>
      )}
    </div>
  )
}
