import type { Citation, CorpusVersion } from '@/components/versions'
import { eurLexUrl } from '@/lib/eur-lex'
import { group } from '@/lib/format'

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
 * `.claude/wireframes/answer.md` § Reading the Act.
 *
 * The quote is an excerpt clamped to `lines`, and the full text is one
 * activation away in the Act. The handle under it always names the provision's
 * length. Whether the clamp cut a given provision depends on the column's width
 * at render, which a character count cannot predict, and a handle that named the
 * length only when it guessed a cut would sometimes sit under a cut quote
 * reading as though it were whole. The note is never clamped, since it is the
 * one layer the amendment adds rather than a part of the statute.
 */
export function CitationBlock({
  citation,
  onOpen,
  lines = 6,
}: {
  citation: Citation
  onOpen?: (provisionId: string, version: CorpusVersion) => void
  lines?: number
}) {
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
            onClick={() => {
              onOpen(citation.provision_id, citation.version)
            }}
            className="text-[12px] font-semibold text-accent underline-offset-2 hover:underline"
          >
            {citation.citation}
          </button>
        ) : (
          <span className="text-[12px] font-semibold text-ink">
            {citation.citation}
          </span>
        )}
        <a
          href={eurLexUrl(citation)}
          className="text-[10.5px] text-muted hover:text-accent hover:underline"
        >
          EUR-Lex ↗
        </a>
        {citation.changed ? (
          <span className="rounded-full border border-cite-rule-moved bg-paper px-2 py-px text-[11px] text-warning">
            moved by the amendment
          </span>
        ) : (
          <span className="rounded-[3px] border border-rule px-[5px] py-px font-mono text-[10px] tracking-[0.05em] text-muted uppercase">
            {citation.version === 'consolidated' ? 'amended' : 'original'}
          </span>
        )}
      </figcaption>

      <blockquote
        className="m-0 line-clamp-(--excerpt-lines) font-[family-name:var(--font-serif)] text-[13px] leading-[1.5] text-act"
        style={{ '--excerpt-lines': lines } as React.CSSProperties}
      >
        {citation.text}
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
          onClick={() => {
            onOpen(citation.provision_id, citation.version)
          }}
          className="mt-[4px] text-[12px] text-accent underline-offset-2 hover:underline"
        >
          {`Read all ${group(citation.text.length)} characters in the Act`}
          <span aria-hidden="true"> →</span>
        </button>
      )}
    </figure>
  )
}
