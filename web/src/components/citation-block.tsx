import type { Citation } from '@/components/versions'

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
 */
export function CitationBlock({ citation }: { citation: Citation }) {
  return (
    <figure
      className={`mt-[10px] border-l-2 py-[2px] pl-[14px] ${
        citation.changed ? 'border-cite-rule-moved' : 'border-cite-rule'
      }`}
    >
      <figcaption className="mb-[2px] flex flex-wrap items-baseline gap-2">
        <span className="text-[12px] font-semibold text-ink">
          {citation.citation}
        </span>
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

      <blockquote className="m-0 font-[family-name:var(--font-serif)] text-[13px] leading-[1.5] text-act">
        {citation.text}
      </blockquote>

      {citation.change_note && (
        // The note is the one layer a reader might mistake for statute, so it
        // carries the amendment's own color rather than the Act's grey.
        <p className="mt-[6px] border-t border-warning-rule pt-[6px] text-[12px] leading-[1.45] text-warning">
          <span className="mr-[7px] text-[11.5px] font-semibold italic">
            Not the Act&apos;s words:
          </span>
          {citation.change_note}
        </p>
      )}
    </figure>
  )
}
