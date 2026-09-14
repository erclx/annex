'use client'

import { useState } from 'react'

import { useDocked } from '@/lib/use-docked'

interface ReplayNoticeProps {
  /**
   * The date this band names, and whether it dates one shown answer.
   *
   * `specific` is true when an answer is on screen, wording the sentence as
   * a claim about that one recording. It is false on the landing page and
   * before anything is asked, wording it as covering the set instead, since
   * no single answer is what the visitor is looking at.
   */
  capturedOn: string
  specific: boolean
}

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
 * re-capture moves it and a stale recording cannot claim to be fresh, and it
 * is the caller's own answer's date rather than one shared constant, since a
 * narrowed re-capture can leave two recordings dated differently. The commit
 * no longer renders here, per the operator's second-use pass: it named a
 * build a visitor has no use for reading, and the terms strip dropped its
 * matching glossary entry in the same pass. Copy is owned by
 * `canon/wireframes/answer.md`.
 */
export function ReplayNotice({ capturedOn, specific }: ReplayNoticeProps) {
  const docked = useDocked()
  const [isOpen, setIsOpen] = useState(false)

  const details = (
    <>
      <span className="text-[12px] text-muted">
        Nothing on this page calls a model.
      </span>
      <span className="text-[12px] text-muted">
        {specific
          ? `Every answer was captured from the live system on ${capturedOn}.`
          : `Every answer was captured from the live system, most recently on ${capturedOn}.`}
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
