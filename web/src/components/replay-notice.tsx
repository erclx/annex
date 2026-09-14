'use client'

import { useState } from 'react'

import { capturedOn } from '@/lib/replay'
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
 * The date is read off the capture manifest rather than typed, so a
 * re-capture moves it and a stale recording cannot claim to be fresh. The
 * commit no longer renders here, per the operator's second-use pass: it named
 * a build a visitor has no use for reading, and the terms strip dropped its
 * matching glossary entry in the same pass. Copy is owned by
 * `canon/wireframes/answer.md`.
 */
export function ReplayNotice() {
  const docked = useDocked()
  const [isOpen, setIsOpen] = useState(false)

  const details = (
    <>
      <span className="text-[12px] text-muted">
        Nothing on this page calls a model.
      </span>
      <span className="text-[12px] text-muted">
        Every answer was captured from the live system on {capturedOn}.
      </span>
    </>
  )

  return (
    <div className="border-b border-rule bg-surface">
      <div className="flex w-full flex-wrap items-baseline gap-x-2 gap-y-1 px-6 py-[9px] lg:px-8">
        <b className="text-[12px] font-semibold text-ink">
          You are looking at a recording.
        </b>
        {docked ? (
          details
        ) : (
          <>
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
