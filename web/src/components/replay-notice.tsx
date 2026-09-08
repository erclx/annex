import { capturedFrom, capturedOn } from '@/lib/replay'

/**
 * The band saying this page is a recording, rendered in every state.
 *
 * On the page rather than in a footnote because the claim a visitor would
 * otherwise carry away is that they watched a model answer. They did not. The
 * model this project runs holds 30 GB of a card, nothing hosted answers these
 * questions, and what a deployment can honestly serve is what the live system
 * already said.
 *
 * The date and the commit are read off the capture manifest rather than typed,
 * so a re-capture moves them and a stale recording cannot claim to be fresh.
 * Copy is owned by `.claude/wireframes/answer.md`.
 */
export function ReplayNotice() {
  return (
    <div className="border-b border-rule bg-surface">
      <div className="mx-auto flex w-full max-w-4xl flex-wrap items-baseline gap-x-2 gap-y-1 px-6 py-[9px]">
        <b className="text-[12px] font-semibold text-ink">
          This page replays a recording. Nothing here is asking a model.
        </b>
        <span className="text-[12px] text-muted">
          Every answer below came back from the live system on {capturedOn} and
          was captured as it stood.
        </span>
        <span className="font-mono text-[10.5px] text-muted">
          {capturedFrom.slice(0, 7)}
        </span>
      </div>
    </div>
  )
}
