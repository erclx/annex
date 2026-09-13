'use client'

import { useState } from 'react'

import type { CorpusVersion } from '@/components/versions'
import { citationLabel } from '@/lib/corpus'

interface Edge {
  source_id: string
  target_id: string
  hop: number
}

/**
 * What the chips draw, shared by a finished trace and a run still streaming.
 *
 * `dropped_ids` is null until the budget has run, which is how a chip avoids
 * reading as kept or as set aside before anything decided which.
 */
export interface WalkShape {
  searched_ids: readonly string[]
  traversed_ids: readonly string[]
  edges: readonly Edge[]
  dropped_ids: readonly string[] | null
}

interface Row {
  searchedId: string
  articleId: string | null
  groups: Group[]
}

interface Group {
  sourceId: string
  ids: string[]
}

/**
 * The walk as chips grouped by what reached them, under the Act's own names.
 *
 * Picked in the first-use operator pass, as arm 3 for the wait (O2) and arm 3
 * for the finished walk (L4, C3), and it supersedes the layered drawing
 * `canon/ARCHITECTURE.md` records as picked on 2026-09-12. A row per search
 * result: the paragraph search found, the article the walk lifted it to, and
 * everything cited from there as wrapped chips, so a source citing thirty
 * provisions reads as one block rather than thirty crossing lines. A group a
 * hop further sits under the chip that reached it, headed by that chip's name.
 *
 * Rows replace the draft's curves between columns. Every edge the walk takes
 * has exactly one source, so a provision always sits in its source's row and
 * no link has to cross another to reach it.
 *
 * Chips are buttons named by their citation, so the walk is readable and
 * openable from the keyboard, and focus traces the path that reached a chip
 * the way hover does.
 */
export function WalkChips({
  walk,
  version,
  revealed,
  onOpen,
  summarized = false,
}: {
  walk: WalkShape
  version: CorpusVersion
  /** How many provisions have appeared so far, in the order the walk reached them. */
  revealed?: number
  onOpen?: (provisionId: string) => void
  summarized?: boolean
}) {
  const [tracedId, setTracedId] = useState<string | null>(null)

  const searched = [...new Set(walk.searched_ids)]
  const sourceOf = new Map(
    walk.edges.map((edge) => [edge.target_id, edge.source_id]),
  )
  const rows = rowsOf(searched, walk)
  const visible = new Set(
    revealOrder(rows, walk).slice(0, revealed ?? Number.POSITIVE_INFINITY),
  )
  const dropped = new Set(walk.dropped_ids ?? [])
  const traced = new Set(pathTo(tracedId, sourceOf))
  const hasWalk = walk.traversed_ids.length > 0

  const chipFor = (id: string, shape: 'dot' | 'pill') => (
    <Chip
      key={id}
      id={id}
      label={citationLabel(version, id)}
      shape={shape}
      isDropped={dropped.has(id)}
      isTraced={traced.has(id)}
      onTrace={setTracedId}
      onOpen={onOpen}
    />
  )

  return (
    <div className="@container">
      {summarized && (
        <p className="mb-3 text-[13px] leading-[1.55] text-act">
          {summaryOf(searched.length, walk, dropped.size)}
        </p>
      )}
      <div
        role="group"
        aria-label={`The walk, ${searched.length} found by search and ${walk.traversed_ids.length} reached from them`}
        data-tracing={tracedId !== null}
        className="group"
      >
        <div
          aria-hidden="true"
          className={`mb-2 font-mono text-[11px] tracking-[0.08em] text-muted uppercase ${
            hasWalk
              ? 'hidden @min-[520px]:grid @min-[520px]:grid-cols-[minmax(0,9.5rem)_minmax(0,7.5rem)_minmax(0,1fr)] @min-[520px]:gap-x-4'
              : ''
          }`}
        >
          <span>Found by search</span>
          {hasWalk && <span>Their article</span>}
          {hasWalk && <span>Cited from there</span>}
        </div>

        <ul className="m-0 flex list-none flex-col gap-y-[6px] p-0">
          {rows.map((row) => {
            if (!visible.has(row.searchedId)) return null
            return (
              <li
                key={row.searchedId}
                className="grid grid-cols-1 gap-x-4 gap-y-1 @min-[520px]:grid-cols-[minmax(0,9.5rem)_minmax(0,7.5rem)_minmax(0,1fr)]"
              >
                <div>{chipFor(row.searchedId, 'dot')}</div>
                <div className="pl-4 @min-[520px]:pl-0">
                  {row.articleId !== null &&
                    visible.has(row.articleId) &&
                    chipFor(row.articleId, 'dot')}
                </div>
                <div className="flex flex-col gap-y-1 pl-8 @min-[520px]:pl-0">
                  {row.groups.map((group) => {
                    const shown = group.ids.filter((id) => visible.has(id))
                    if (shown.length === 0) return null
                    const isNested =
                      group.sourceId !== row.searchedId &&
                      group.sourceId !== row.articleId
                    const sourceLabel = citationLabel(version, group.sourceId)
                    return (
                      <div
                        key={group.sourceId}
                        role="group"
                        aria-label={`Cited from ${sourceLabel}`}
                        className="flex flex-wrap items-center gap-1"
                      >
                        {isNested && (
                          <span
                            aria-hidden="true"
                            className="mr-1 text-[11px] text-muted"
                          >
                            via {sourceLabel}
                          </span>
                        )}
                        {shown.map((id) => chipFor(id, 'pill'))}
                      </div>
                    )
                  })}
                </div>
              </li>
            )
          })}
        </ul>

        {dropped.size > 0 && hasWalk && (
          <p className="mt-3 text-[11px] text-muted">
            Dashed: reached, set aside to fit the prompt, never read
          </p>
        )}
      </div>
    </div>
  )
}

function Chip({
  id,
  label,
  shape,
  isDropped,
  isTraced,
  onTrace,
  onOpen,
}: {
  id: string
  label: string
  shape: 'dot' | 'pill'
  isDropped: boolean
  isTraced: boolean
  onTrace: (id: string | null) => void
  onOpen?: (provisionId: string) => void
}) {
  const trace = {
    onMouseEnter: () => {
      onTrace(id)
    },
    onMouseLeave: () => {
      onTrace(null)
    },
    onFocus: () => {
      onTrace(id)
    },
    onBlur: () => {
      onTrace(null)
    },
  }
  const faded =
    'transition-opacity group-data-[tracing=true]:opacity-40 data-[traced=true]:opacity-100 motion-reduce:transition-none'

  return (
    <button
      type="button"
      aria-label={isDropped ? `${label}, set aside to fit the prompt` : label}
      data-traced={isTraced ? 'true' : undefined}
      onClick={() => onOpen?.(id)}
      {...trace}
      className={
        shape === 'dot'
          ? `inline-flex items-center gap-[7px] rounded-sm text-left text-[12px] text-ink hover:underline data-[traced=true]:text-accent ${faded}`
          : `rounded-full border px-[7px] py-px text-[12px] leading-[1.45] hover:border-accent data-[traced=true]:border-accent data-[traced=true]:ring-1 data-[traced=true]:ring-accent ${
              isDropped
                ? 'border-dashed border-cite-rule bg-transparent text-muted group-data-[tracing=false]:opacity-70'
                : 'border-cite-rule bg-accent-soft text-ink'
            } ${faded}`
      }
    >
      {shape === 'dot' && (
        <span
          aria-hidden="true"
          className="h-[6px] w-[6px] shrink-0 rounded-full bg-accent"
        />
      )}
      {label}
    </button>
  )
}

/** One row per search result, holding what the walk reached from it. */
function rowsOf(searched: string[], walk: WalkShape): Row[] {
  const childrenOf = new Map<string, string[]>()
  const liftOf = new Map<string, string>()
  for (const edge of walk.edges) {
    if (edge.hop === 0) {
      liftOf.set(edge.source_id, edge.target_id)
      continue
    }
    const children = childrenOf.get(edge.source_id) ?? []
    children.push(edge.target_id)
    childrenOf.set(edge.source_id, children)
  }

  const placed = new Set<string>()
  const rows = searched.map((searchedId): Row => {
    const articleId = liftOf.get(searchedId) ?? null
    const groups: Group[] = []
    const queue = [searchedId, ...(articleId === null ? [] : [articleId])]
    placed.add(searchedId)
    if (articleId !== null) placed.add(articleId)

    while (queue.length > 0) {
      const sourceId = queue.shift() as string
      const ids = (childrenOf.get(sourceId) ?? []).filter(
        (id) => !placed.has(id),
      )
      if (ids.length === 0) continue
      ids.forEach((id) => placed.add(id))
      groups.push({ sourceId, ids })
      queue.push(...ids)
    }
    return { searchedId, articleId, groups }
  })

  // A trace recorded before edges existed names what the walk reached and not
  // how, so those provisions share one group rather than vanishing.
  const unplaced = walk.traversed_ids.filter((id) => !placed.has(id))
  if (unplaced.length > 0 && rows.length > 0) {
    rows[rows.length - 1].groups.push({
      sourceId: rows[rows.length - 1].searchedId,
      ids: unplaced,
    })
  }
  return rows
}

/** Search's results, then the articles they lift to, then each hop outward. */
function revealOrder(rows: Row[], walk: WalkShape): string[] {
  const hopOf = new Map(walk.edges.map((edge) => [edge.target_id, edge.hop]))
  const reached = rows.flatMap((row) =>
    row.groups.flatMap((group) => group.ids),
  )
  return [
    ...rows.map((row) => row.searchedId),
    ...rows.flatMap((row) => (row.articleId === null ? [] : [row.articleId])),
    ...[...reached].sort(
      (a, b) =>
        (hopOf.get(a) ?? Number.MAX_SAFE_INTEGER) -
        (hopOf.get(b) ?? Number.MAX_SAFE_INTEGER),
    ),
  ]
}

/** The chip's own id and every provision back to the search result it came from. */
function pathTo(id: string | null, sourceOf: Map<string, string>): string[] {
  const path: string[] = []
  let current = id
  while (current !== null && !path.includes(current)) {
    path.push(current)
    current = sourceOf.get(current) ?? null
  }
  return path
}

function summaryOf(
  searchedCount: number,
  walk: WalkShape,
  droppedCount: number,
): string {
  const lifted = walk.edges.filter((edge) => edge.hop === 0).length
  const followed = walk.traversed_ids.length - lifted
  const reached = searchedCount + walk.traversed_ids.length

  const found = `Search found ${plural(searchedCount, 'provision')}.`
  const walked =
    walk.traversed_ids.length === 0
      ? ' The walk reached nothing beyond them.'
      : lifted === 0
        ? ` The walk followed their references to ${followed} more.`
        : ` The walk lifted ${lifted} of them to ${lifted === 1 ? 'its' : 'their'} whole article and followed references to ${followed} more.`
  const cut =
    walk.dropped_ids === null
      ? ''
      : droppedCount === 0
        ? ` All ${reached} reached fit the prompt.`
        : ` Of the ${reached} reached, ${droppedCount} ${droppedCount === 1 ? 'was' : 'were'} set aside to fit the prompt, shown dashed, and never read.`
  return `${found}${walked}${cut}`
}

function plural(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? '' : 's'}`
}
