'use client'

import { useState } from 'react'

import { capturedFrom, capturedOn } from '@/lib/replay'
import { useDocked } from '@/lib/use-docked'

/**
 * The band saying this page is a recording, rendered in every state.
 *
 * On the page rather than in a footnote because the claim a visitor would
 * otherwise carry away is that they watched a model answer. They did not. The
 * model this project runs holds 30 GB of a card, nothing hosted answers these
 * questions, and what a deployment can honestly serve is what the live system
 * already said.
 *
 * Below 1024 pixels the band is one line with the rest behind a details
 * control, picked in the operator's first-use pass so the question starts near
 * the top of a phone screen. The short line still says it is a recording, so
 * nothing the page claims changes with the width.
 *
 * The date and the commit are read off the capture manifest rather than typed,
 * so a re-capture moves them and a stale recording cannot claim to be fresh.
 * Copy is owned by `canon/wireframes/answer.md`.
 */
export function ReplayNotice() {
  const docked = useDocked()
  const [isOpen, setIsOpen] = useState(false)

  const details = (
    <>
      <span className="text-[12px] text-muted">
        Every answer below came back from the live system on {capturedOn} and
        was captured as it stood.
      </span>
      <span className="font-mono text-[10.5px] text-muted">
        {capturedFrom.slice(0, 7)}
      </span>
    </>
  )

  return (
    <div className="border-b border-rule bg-surface">
      <div className="flex w-full flex-wrap items-baseline gap-x-2 gap-y-1 px-6 py-[9px] lg:px-8">
        {docked ? (
          <>
            <b className="text-[12px] font-semibold text-ink">
              This page replays a recording. Nothing here is asking a model.
            </b>
            {details}
          </>
        ) : (
          <>
            <b className="text-[12px] font-semibold text-ink">
              A recording, not a live model.
            </b>
            <button
              type="button"
              aria-expanded={isOpen}
              onClick={() => {
                setIsOpen(!isOpen)
              }}
              className="text-[12px] text-accent underline-offset-2 hover:underline"
            >
              Details
            </button>
            {isOpen && details}
          </>
        )}
      </div>
    </div>
  )
}
