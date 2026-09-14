import { ComparisonArgument } from '@/components/answer/comparison-argument'
import { TermsStrip } from '@/components/shared/terms-strip'

/**
 * The pane beside a timeout or an unexpected failure at 1024 pixels and wider:
 * the terms and the three-arm comparison.
 *
 * No pick or command answers either state, so rather than leaving half the
 * screen empty the pane holds what the landing page sets as its own sections,
 * per `canon/wireframes/answer.md` § The next step beside a failure. Below 1024
 * there is no pane, and the failure region stands alone.
 */
export function TermsPane() {
  return (
    <aside
      aria-label="Terms and the comparison"
      className="sticky top-(--annex-bar-height) flex h-[calc(100vh-var(--annex-bar-height,0px))] flex-col border-l border-rule bg-surface"
    >
      <header className="border-b border-rule px-5 py-[13px]">
        <span className="text-[10.5px] text-muted">
          Terms and the comparison
        </span>
      </header>
      <div className="flex flex-1 flex-col gap-8 overflow-y-auto px-5 py-4">
        <TermsStrip />
        <ComparisonArgument />
      </div>
    </aside>
  )
}
