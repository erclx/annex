import { TermsStrip } from '@/components/terms-strip'

/**
 * What the pane holds before a question is asked: the terms, and the region
 * reserved for the three-arm comparison.
 *
 * Picked by looking over three other contents, recorded under frontend scope in
 * `.claude/ARCHITECTURE.md`. Docked, it is a region beside the form. Below
 * 1024 pixels there is no pane, so the same content follows the recorded picks
 * in the one column and nothing the pane held is lost.
 */
export function BeforeYouAsk({ docked }: { docked: boolean }) {
  const content = (
    <>
      <TermsStrip />
      <ReservedComparison />
    </>
  )

  if (!docked) {
    return <div className="flex flex-col gap-8 pb-16">{content}</div>
  }

  return (
    <aside
      aria-label="Before you ask"
      className="sticky top-0 flex h-screen flex-col border-l border-rule bg-surface"
    >
      <header className="border-b border-rule px-5 py-[13px]">
        <span className="font-mono text-[10.5px] tracking-[0.08em] text-muted uppercase">
          Before you ask
        </span>
      </header>
      <div className="flex flex-1 flex-col gap-8 overflow-y-auto px-5 py-4">
        {content}
      </div>
    </aside>
  )
}

/**
 * The place the comparison of reading the whole Act, search alone, and search
 * with traversal will take, held empty so nothing else claims it first.
 */
function ReservedComparison() {
  return (
    <section className="border border-dashed border-cite-rule px-4 py-[14px] text-[12.5px] leading-[1.5] text-muted">
      <b className="mb-1 block text-[13px] font-semibold text-ink">
        Reserved: the three-arm comparison
      </b>
      Reading the whole Act, search alone, and search with reference traversal,
      compared on accuracy and cost. Nothing sits here yet.
    </section>
  )
}
