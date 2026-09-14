import { Fragment, useState } from 'react'

import type { Citation, CorpusVersion } from '@/components/versions'
import { VERSION_LABEL } from '@/components/versions'
import {
  amendmentDiff,
  type DiffSpan,
  joinDiffSpans,
  sliceDiffSpans,
} from '@/lib/amendment-diff'
import { closestPoint, type Landing } from '@/lib/closest-point'
import { eurLexUrl } from '@/lib/eur-lex'
import { group } from '@/lib/format'

const CHIP_LABEL: Record<'added' | 'changed' | 'removed', string> = {
  added: 'added by the amendment',
  changed: 'moved by the amendment',
  removed: 'removed by the amendment',
}

function otherVersionOf(version: CorpusVersion): CorpusVersion {
  return version === 'original' ? 'consolidated' : 'original'
}

/**
 * What the line beside the citation says about where the excerpt opens.
 *
 * Closest rather than quoted, since the landing is the passage sharing the most
 * words with the claim and not a passage the model is known to have read the
 * claim from. `canon/wireframes/answer.md` § Answered owns the copy.
 */
const LANDING_LABEL: Record<Landing['kind'], string | null> = {
  point: 'closest point',
  top: 'whole provision, no single passage wins',
  whole: null,
}

/**
 * One provision, quoted behind a left rule.
 *
 * Three layers appear inside this block and a reader has to separate them
 * without effort: the claim above it, the Act's own words, and our note about
 * the Act. The note is the layer likeliest to be mistaken for statute, so it
 * is fenced off by a rule and named outright. The label is blunt on purpose.
 *
 * The citation reads as a heading rather than as a code token, which is the
 * settled design's call: it is the reader's handle on the Act, so it takes the
 * interface sans at weight 600. The marker beside it is a label and takes the
 * label treatment.
 *
 * `onOpen`, when supplied, turns the citation into the reader's own handle on
 * the Act: a control that opens the provision in the reading panel rather
 * than plain text naming it.
 *
 * The EUR-Lex link is a second, quieter control beside it rather than on it.
 * The loud heading stays the control that keeps a reader here, and EUR-Lex is
 * the escape hatch for one who wants the source of record instead, per
 * `canon/wireframes/answer.md` § Reading the Act.
 *
 * The quote is an excerpt clamped to `lines`, and the full text is one
 * activation away in the Act. Given the `claim` it sits under, the excerpt
 * opens on the closest point per `@/lib/closest-point`, the heading names that
 * point, and the heading and the handle both open the Act there. The handle
 * always names the provision's whole length. Whether the clamp cut a given
 * provision depends on the column's width at render, which a character count
 * cannot predict, and a handle that named the length only when it guessed a cut
 * would sometimes sit under a cut quote reading as though it were whole. The
 * note is never clamped, since it is the one layer the amendment adds rather
 * than a part of the statute.
 */
export function CitationBlock({
  citation,
  claim,
  onOpen,
  lines = 6,
}: {
  citation: Citation
  claim?: string
  onOpen?: (provisionId: string, version: CorpusVersion, point?: string) => void
  lines?: number
}) {
  const landing: Landing =
    claim === undefined ? { kind: 'whole' } : closestPoint(citation, claim)
  const heading = landing.kind === 'point' ? landing.name : citation.citation
  const point =
    landing.kind === 'point' ? landing.segment.path.join('.') : undefined
  const excerptStart =
    landing.kind === 'point' && landing.segment.start > 0
      ? landing.segment.start
      : 0
  const excerpt =
    excerptStart > 0 ? `… ${citation.text.slice(excerptStart)}` : citation.text
  const landingLabel = LANDING_LABEL[landing.kind]

  const diff = citation.changed ? amendmentDiff(citation.provision_id) : null
  const otherVersion = otherVersionOf(citation.version)
  const hasOtherVersion = diff !== null && diff.status === 'changed'

  const citationKey = `${citation.provision_id}:${citation.version}`
  const [shownVersion, setShownVersion] = useState<CorpusVersion>(
    citation.version,
  )
  const [trackedKey, setTrackedKey] = useState(citationKey)
  if (trackedKey !== citationKey) {
    setTrackedKey(citationKey)
    setShownVersion(citation.version)
  }
  const isShowingOther = hasOtherVersion && shownVersion !== citation.version

  const excerptSpans: DiffSpan[] | null =
    diff !== null && diff.status === 'changed'
      ? joinDiffSpans(
          isShowingOther
            ? [...(diff[shownVersion] ?? [])]
            : sliceDiffSpans(diff[citation.version] ?? [], excerptStart),
        )
      : null

  function handleOpen() {
    if (point === undefined) onOpen?.(citation.provision_id, citation.version)
    else onOpen?.(citation.provision_id, citation.version, point)
  }

  return (
    <figure
      className={`mt-[10px] border-l-2 py-[2px] pl-[14px] ${
        citation.changed ? 'border-cite-rule-moved' : 'border-cite-rule'
      }`}
    >
      <figcaption className="mb-[2px] flex flex-wrap items-baseline gap-2">
        {onOpen ? (
          <button
            type="button"
            onClick={handleOpen}
            className="text-[12px] font-semibold text-accent underline-offset-2 hover:underline"
          >
            {heading}
          </button>
        ) : (
          <span className="text-[12px] font-semibold text-ink">{heading}</span>
        )}
        {landingLabel && (
          <span className="text-[11px] text-muted">{landingLabel}</span>
        )}
        <a
          href={eurLexUrl(citation)}
          className="text-[10.5px] text-muted hover:text-accent hover:underline"
        >
          EUR-Lex ↗
        </a>
        {citation.changed ? (
          <span className="rounded-full border border-cite-rule-moved bg-paper px-2 py-px text-[11px] text-warning">
            {CHIP_LABEL[diff?.status ?? 'changed']}
          </span>
        ) : (
          <span className="rounded-[3px] border border-rule px-[5px] py-px text-[10px] text-muted">
            {citation.version === 'consolidated' ? 'amended' : 'original'}
          </span>
        )}
        {hasOtherVersion && (
          <button
            type="button"
            onClick={() => {
              setShownVersion(isShowingOther ? citation.version : otherVersion)
            }}
            className="text-[11px] text-accent underline-offset-2 hover:underline"
          >
            {`Read ${VERSION_LABEL[isShowingOther ? citation.version : otherVersion]}`}
          </button>
        )}
      </figcaption>

      <blockquote
        className="m-0 line-clamp-(--excerpt-lines) font-[family-name:var(--font-serif)] text-[13px] leading-[1.5] text-act"
        style={{ '--excerpt-lines': lines } as React.CSSProperties}
      >
        {excerptSpans !== null ? (
          <>
            {!isShowingOther && excerptStart > 0 && '… '}
            {excerptSpans.map((span, index) =>
              span.changed ? (
                <mark
                  key={index}
                  className="rounded-[2px] border-b-2 border-cite-rule-moved bg-warning-surface text-inherit"
                >
                  {span.text}
                </mark>
              ) : (
                <Fragment key={index}>{span.text}</Fragment>
              ),
            )}
          </>
        ) : (
          excerpt
        )}
      </blockquote>

      {citation.change_note && (
        // The note is the one layer a reader might mistake for statute, so it
        // carries the amendment's own color rather than the Act's grey.
        <p className="mt-[6px] border-t border-warning/30 pt-[6px] text-[12px] leading-[1.45] text-warning">
          <span className="mr-[7px] text-[11.5px] font-semibold italic">
            Not the Act&apos;s words:
          </span>
          {citation.change_note}
        </p>
      )}

      {onOpen && (
        <button
          type="button"
          onClick={handleOpen}
          className="mt-[4px] text-[12px] text-accent underline-offset-2 hover:underline"
        >
          {`Read all ${group(citation.text.length)} characters in the Act`}
          <span aria-hidden="true"> →</span>
        </button>
      )}
    </figure>
  )
}
