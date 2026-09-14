'use client'

import { ComparisonArgument } from '@/components/answer/comparison-argument'
import { ReplayNotice } from '@/components/frame/replay-notice'
import { TopBar } from '@/components/frame/top-bar'
import { TermsStrip } from '@/components/shared/terms-strip'
import { capturedOnFor, REPLAY_MODE } from '@/lib/service/replay'

const GITHUB_URL = 'https://github.com/erclx/annex/blob/main/docs/evaluation.md'

/**
 * How an answer is built and the three-arm comparison, reached from the top
 * bar's `Evaluation` link on every route and from the line under the
 * composer on `/`.
 *
 * Split off the landing page on `feature-evaluation-route`, T6 Pick 5 of the
 * operator's third-use pass, so a visitor meets the tool without scrolling
 * past the project's own argument for itself. `canon/wireframes/answer.md` §
 * Evaluation carries the layout and `canon/ARCHITECTURE.md` the pick.
 */
export default function Evaluation() {
  return (
    <div className="flex min-h-full flex-col bg-paper">
      <TopBar
        traversal={false}
        onTraversalChange={() => {}}
        disabled={false}
        showTraversal={false}
      />

      {REPLAY_MODE && (
        <ReplayNotice capturedOn={capturedOnFor(null, null)} specific={false} />
      )}

      <div className="px-6 lg:px-8">
        <div className="mx-auto flex w-full max-w-[1080px] flex-col gap-10 pb-16 pt-10">
          <div>
            <h1 className="m-0 text-[22px] font-semibold text-ink">
              Evaluation
            </h1>
            <p className="mt-2 mb-0 max-w-[72ch] text-[13px] leading-[1.5] text-act">
              How an answer is built, and how three ways of answering compare on
              the same questions.
            </p>
            <a
              href={GITHUB_URL}
              className="mt-2 inline-block text-[13px] text-accent hover:underline"
            >
              The full write-up is on GitHub →
            </a>
          </div>

          <TermsStrip />
          <ComparisonArgument />
        </div>
      </div>
    </div>
  )
}
