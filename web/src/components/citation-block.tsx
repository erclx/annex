import type { Citation } from '@/components/versions'

/**
 * One provision, quoted behind a left rule.
 *
 * Three layers appear inside this block and a reader has to separate them
 * without effort: the claim above it, the Act's own words, and our note about
 * the Act. The note is the layer likeliest to be mistaken for statute, so it
 * is fenced off by a rule and named outright. The label is blunt on purpose.
 */
export function CitationBlock({ citation }: { citation: Citation }) {
  return (
    <figure
      className={`my-3 border-l-2 pl-4 ${
        citation.changed ? 'border-cite-rule-moved' : 'border-cite-rule'
      }`}
    >
      {/* The citation keeps its own casing. It is the reader's handle on the
          Act rather than an interface label, and `Article 50(1)` is how the
          Act writes it. The marker beside it is a label and takes the label
          treatment: which text this was read from, or, where the amendment
          moved the provision, the stronger statement instead of it. */}
      <figcaption className="flex flex-wrap items-baseline gap-2">
        <span className="font-mono text-[11.5px] text-ink">
          {citation.citation}
        </span>
        {citation.changed ? (
          <span className="rounded-full border border-cite-rule-moved px-2 py-0.5 text-[10.5px] text-warning">
            moved by the amendment
          </span>
        ) : (
          <span className="font-mono text-[10.5px] tracking-[0.08em] text-muted uppercase">
            {citation.version === 'consolidated' ? 'amended' : 'original'}
          </span>
        )}
      </figcaption>

      {/* The serif is the Act talking and the sans is the interface talking,
          per `.claude/DESIGN.md`. The stack is read off the token rather than
          Tailwind's own `font-serif`, which is a different list. */}
      <blockquote className="mt-1 font-[family-name:var(--font-serif)] text-[13px] leading-[1.5] text-act">
        {citation.text}
      </blockquote>

      {citation.change_note && (
        <div className="mt-2 border-t border-rule pt-2">
          <span className="font-semibold text-[11.5px] text-warning italic">
            Not the Act&apos;s words:
          </span>{' '}
          <span className="text-[11.5px] leading-[1.45] text-muted">
            {citation.change_note}
          </span>
        </div>
      )}
    </figure>
  )
}
