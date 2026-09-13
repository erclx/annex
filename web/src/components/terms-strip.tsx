/**
 * The seven terms that render unglossed elsewhere on this surface, gathered
 * into one list rather than marked inline.
 *
 * An inline hover definition was drafted and dropped: it would be a second
 * overlay on a surface `.claude/wireframes/answer.md` § Reading the Act allows
 * one, the Act below 1024 pixels. A gathered list needs no hover state and no
 * second overlay, so it sits in the pane before anything is asked, and under
 * the recorded picks where there is no pane.
 *
 * Five entries restate `.canon/teach/01-how-annex-works/GLOSSARY.md` in page
 * voice. `general-purpose AI model` and `prohibited practice` are not taught
 * there, since that file teaches how this project works rather than what the
 * Act regulates, so those two are written fresh against the Act's own use of
 * the terms in the recorded questions.
 */
const TERMS: { term: string; definition: string }[] = [
  {
    term: 'Provision',
    definition:
      'An addressable piece of the law: an article, a numbered paragraph, or an annex.',
  },
  {
    term: 'Original / Amended 27 Jul 2026',
    definition:
      'The Act as first published, or as the Digital Omnibus changed it on 27 July 2026, moving two of the three compliance deadlines.',
  },
  {
    term: 'Reference traversal',
    definition:
      "Following the Act's own citations outward from what search found, to reach provisions a similarity match would miss.",
  },
  {
    term: 'High risk',
    definition:
      'A classification carrying a chain of duties that other systems do not take on.',
  },
  {
    term: 'General-purpose AI model',
    definition:
      'A model trained for a broad range of tasks rather than one narrow purpose, carrying its own obligations under the Act regardless of what is built on it.',
  },
  {
    term: 'Prohibited practice',
    definition:
      'A use of AI the Act bans outright, such as manipulation that causes harm, rather than one it regulates.',
  },
  {
    term: 'Commit hash',
    definition:
      'The exact build a recorded answer was captured from, so a stale recording can be told from a fresh one.',
  },
]

export function TermsStrip() {
  return (
    <section>
      <span className="font-mono text-[10.5px] tracking-[0.08em] text-muted uppercase">
        Terms used on this page
      </span>
      <dl className="mt-2 grid grid-cols-1 gap-x-4 gap-y-[6px] sm:grid-cols-[max-content_1fr]">
        {TERMS.map(({ term, definition }) => (
          <div key={term} className="contents">
            <dt className="text-[12px] font-semibold text-ink">{term}</dt>
            <dd className="m-0 text-[12px] leading-[1.5] text-act">
              {definition}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
