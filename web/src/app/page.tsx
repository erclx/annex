'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'

import { ComparisonArgument } from '@/components/answer/comparison-argument'
import {
  type DescriptionError,
  DescriptionForm,
} from '@/components/answer/description-form'
import { RecordedPicks } from '@/components/answer/recorded-picks'
import { ReplayNotice } from '@/components/frame/replay-notice'
import {
  TopBar,
  TraversalSwitch,
  VersionToggle,
} from '@/components/frame/top-bar'
import { TermsStrip } from '@/components/shared/terms-strip'
import {
  addressSearch,
  forwardedAskPath,
  readAddress,
} from '@/lib/browser/address'
import { useAskHandoff } from '@/lib/browser/ask-handoff'
import { MAXIMUM_DESCRIPTION } from '@/lib/service/ask'
import {
  capturedOnFor,
  recordedQuestionIdFor,
  REPLAY_MODE,
} from '@/lib/service/replay'

/**
 * The composer's placement on the landing page, set from here rather than in
 * `DescriptionForm`, whose copy `canon/wireframes/answer.md` owns verbatim.
 *
 * Below 1024 pixels it keeps the one column's left edge. At 1024 and wider it
 * centers under the bar on a 760 pixel measure, with a larger heading and the
 * composer at the answer column's 640, per N1 arm 2 of the operator's
 * second-use pass.
 */
const INTRO =
  'px-6 lg:mx-auto lg:w-full lg:max-w-[760px] lg:px-0 lg:pt-2 lg:[&_form]:items-center lg:[&_form>div]:w-full lg:[&_form>div]:max-w-[640px] lg:[&_form>p]:text-center lg:[&_h1]:max-w-none lg:[&_h1]:text-center lg:[&_h1]:text-[34px] lg:[&_h1]:leading-[1.25]'

/**
 * The recorded questions, the terms and the comparison as full-width sections.
 *
 * The measure is held at 1080 pixels inside the gutter rather than including
 * it, so the comparison's container reaches the 1 040 its two columns need at
 * 1280 and wider.
 */
const SECTIONS = 'mx-auto flex w-full max-w-[1080px] flex-col gap-10 pb-16'

/** Which of the two validation messages a description earns, if any. */
function descriptionErrorFor(description: string): DescriptionError | null {
  const trimmed = description.trim()
  if (trimmed === '') return 'empty'
  if (trimmed.length > MAXIMUM_DESCRIPTION) return 'too-long'
  return null
}

/**
 * The landing page: what the tool does, the composer, the recorded questions,
 * then the terms and the three-arm comparison.
 *
 * Nothing here asks the service. A valid submit or a pick writes the handoff
 * and opens `/ask`, which holds the answer, so the browser's back action and
 * the mark in the bar both return here. The handoff is written before the
 * navigation, since this page unmounts as it happens.
 *
 * A link shared while the answer lived at `/` forwards to the same answer at
 * `/ask` on the deployed build, the one build that ever wrote a question into
 * the address.
 */
export default function Home() {
  const router = useRouter()
  const { handoff, setHandoff } = useAskHandoff()
  const { description, version, traversal, rejected } = handoff
  const [touched, setTouched] = useState(false)

  /** Whether the address has been read into the page yet. */
  const hasReadAddress = useRef(false)

  // The address is an external system read once, after hydration, because the
  // static export renders this page with no address at all.
  useEffect(() => {
    if (hasReadAddress.current) return
    hasReadAddress.current = true
    const search = window.location.search
    const forward = REPLAY_MODE ? forwardedAskPath(search) : null
    if (forward !== null) {
      router.replace(forward)
      return
    }
    const address = readAddress(search)
    if (address.version) setHandoff({ version: address.version })
  }, [router, setHandoff])

  // A description the service rejected with a length the form would pass is
  // still named as empty, the one other reason the service gives `invalid`.
  const formError = rejected
    ? (descriptionErrorFor(description) ?? 'empty')
    : touched
      ? descriptionErrorFor(description)
      : null

  const openAsk = useCallback(
    (question?: string) => {
      router.push(`/ask${addressSearch({ question, version })}`)
    },
    [router, version],
  )

  const submit = useCallback(() => {
    setTouched(true)
    if (descriptionErrorFor(description) !== null) return
    setHandoff({ rejected: false })
    openAsk()
  }, [description, openAsk, setHandoff])

  const pick = useCallback(
    (recorded: string) => {
      setTouched(false)
      setHandoff({ description: recorded, rejected: false })
      openAsk(
        REPLAY_MODE
          ? (recordedQuestionIdFor(recorded) ?? undefined)
          : undefined,
      )
    },
    [openAsk, setHandoff],
  )

  const changeTraversal = useCallback(
    (next: boolean) => {
      setHandoff({ traversal: next })
    },
    [setHandoff],
  )

  return (
    <div className="flex min-h-full flex-col bg-paper">
      <TopBar
        traversal={traversal}
        onTraversalChange={changeTraversal}
        disabled={false}
        traversalFixed={REPLAY_MODE}
        showTraversal={false}
      />

      {REPLAY_MODE && (
        <ReplayNotice capturedOn={capturedOnFor(null, null)} specific={false} />
      )}

      <div className={INTRO}>
        <DescriptionForm
          description={description}
          onDescriptionChange={(next) => {
            setHandoff({ description: next, rejected: false })
          }}
          onSubmit={submit}
          error={formError}
          pending={false}
          choices={
            <>
              <VersionToggle
                version={version}
                onVersionChange={(next) => {
                  setHandoff({ version: next })
                }}
                disabled={false}
              />
              <TraversalSwitch
                traversal={traversal}
                onTraversalChange={changeTraversal}
                disabled={false}
                traversalFixed={REPLAY_MODE}
              />
            </>
          }
        />
      </div>

      <div className="px-6 lg:px-8">
        <div className={SECTIONS}>
          <RecordedPicks onPick={pick} />
          <TermsStrip />
          <ComparisonArgument />
        </div>
      </div>
    </div>
  )
}
