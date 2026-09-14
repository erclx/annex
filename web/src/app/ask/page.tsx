'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import {
  ActReader,
  type CitedProvision,
  type PaneView,
} from '@/components/act-reader'
import { AgentSteps } from '@/components/agent-steps'
import { AnswerView } from '@/components/answer-view'
import { ColumnHandle } from '@/components/column-handle'
import { DescribedSystem } from '@/components/described-system'
import {
  FailureNextStep,
  type NextStepState,
} from '@/components/failure-next-step'
import { FailureRegion } from '@/components/failure-region'
import { RefusalView } from '@/components/refusal-view'
import { ReplayNotice } from '@/components/replay-notice'
import { RetrievalTrace, Walk } from '@/components/retrieval-trace'
import { TermsPane } from '@/components/terms-pane'
import { TopBar, TraversalSwitch } from '@/components/top-bar'
import type { CorpusVersion } from '@/components/versions'
import { WaitPane } from '@/components/wait-pane'
import { addressSearch, readAddress } from '@/lib/address'
import type { Answer } from '@/lib/answer'
import { ask, type AskResult } from '@/lib/ask'
import { useAskHandoff } from '@/lib/ask-handoff'
import {
  capturedOnFor,
  recordedDescriptionFor,
  recordedQuestionIdFor,
  REPLAY_MODE,
} from '@/lib/replay'
import { PLAYBACK_SPEEDUP } from '@/lib/replay-playback'
import { useColumnWidth } from '@/lib/use-column-width'
import { useDocked } from '@/lib/use-docked'
import { advance, startProgress, type WalkProgress } from '@/lib/walk-progress'

/**
 * The answer column's measure beside a pane that is not the Act: the steps
 * while a question runs, a next step, or the terms beside a failure, from
 * `canon/DESIGN.md` § Layout.
 */
const SPLIT = 'grid grid-cols-[minmax(0,640px)_minmax(420px,1fr)] items-start'

/**
 * An answer beside the Act: the answer column at the width the reader set, a
 * gutter holding the handle that sets it, and the pane taking the rest. The
 * width reads the custom property the pre-paint script and the column store
 * both write, so it never renders at one width and moves to another.
 */
const ANSWER_SPLIT =
  'grid grid-cols-[minmax(0,var(--annex-answer-width,640px))_40px_minmax(420px,1fr)] items-start'

/**
 * Every provision an answer or a refusal cites, once, in first-cited order.
 *
 * A refusal's provisions also say whether search found each or the walk
 * reached it, which its reading list tags every row with.
 */
function citedIn(answer: Answer): CitedProvision[] {
  const { searched_ids: searched, traversed_ids: traversed } = answer.retrieval
  const citations = answer.refusal
    ? answer.refusal.consulted
    : answer.claims.flatMap((claim) => claim.citations)
  const seen = new Set<string>()
  return citations.flatMap((citation) => {
    if (seen.has(citation.provision_id)) return []
    seen.add(citation.provision_id)
    const provision: CitedProvision = {
      provisionId: citation.provision_id,
      label: citation.citation,
    }
    if (answer.refusal && searched.includes(citation.provision_id)) {
      provision.reachedBy = 'search'
    } else if (answer.refusal && traversed.includes(citation.provision_id)) {
      provision.reachedBy = 'walk'
    }
    return [provision]
  })
}

function isNextStepState(state: AskResult['state']): state is NextStepState {
  return (
    state === 'unrecorded' || state === 'unavailable' || state === 'unreachable'
  )
}

/**
 * The two-column tool: the described system, then the answer, the refusal, or
 * the failure. At 1024 pixels and wider the Act is a region beside the answer
 * column rather than something over it, and below that width it is an
 * overlay, per `canon/wireframes/answer.md`.
 *
 * It opens on what the address names on the deployed build and on the handoff
 * the landing page wrote on either build. With neither it replaces itself with
 * `/`, carrying any handoff text back into the composer, since asking again on
 * a reload would start a model call nobody requested.
 *
 * Every call to the service goes through `@/lib/ask` and nothing here touches
 * `fetch`. That is what makes the deployed build's swap to captured fixtures a
 * change to one module rather than to this file.
 */
export default function Ask() {
  const router = useRouter()
  const docked = useDocked()
  const { handoff, setHandoff } = useAskHandoff()
  const { version, traversal } = handoff
  const [asked, setAsked] = useState<string | null>(null)
  const [result, setResult] = useState<AskResult | null>(null)
  const [pending, setPending] = useState(false)
  const [progress, setProgress] = useState<WalkProgress | null>(null)
  const [readerVersion, setReaderVersion] =
    useState<CorpusVersion>('consolidated')
  const [readerProvisionId, setReaderProvisionId] = useState<string | null>(
    null,
  )
  const [readerPoint, setReaderPoint] = useState<string | null>(null)
  const [paneView, setPaneView] = useState<PaneView>('act')
  const { width: answerWidth, setWidth, resetWidth } = useColumnWidth()

  /**
   * The in-flight ask, so a re-ask replaces its answer rather than racing it.
   *
   * The version toggle and the traversal switch both re-ask, and an ask runs 21
   * to 28 seconds, so two can overlap by a wide margin. Without this the slower
   * of the two lands last and the surface shows an answer against the text the
   * reader just toggled away from.
   */
  const inFlight = useRef<AbortController | null>(null)

  /** Whether the address has been read into the page yet. */
  const hasReadAddress = useRef(false)

  // Leaving the page, by the mark, the back action or Edit description, ends
  // the ask it started rather than letting it resolve into an unmounted page.
  // The address is marked unread again with it, because strict mode rehearses
  // an unmount straight after the first mount, and a remount that still counted
  // the address as read would never ask again after this abort.
  useEffect(() => {
    const flights = inFlight
    const addressRead = hasReadAddress
    return () => {
      flights.current?.abort()
      addressRead.current = false
    }
  }, [])

  /**
   * `play` decides whether the deployed build paces its recording through the
   * steps first. A pick and a reopened address play, and the version toggle
   * does not, since an instant toggle is what the first-use pass accepted
   * re-asking on replay for.
   */
  const run = useCallback(
    async (
      text: string,
      against: CorpusVersion,
      follow: boolean,
      play = true,
    ) => {
      inFlight.current?.abort()
      const controller = new AbortController()
      inFlight.current = controller

      setAsked(text)
      setResult(null)
      setPending(true)
      setProgress(startProgress(Date.now()))
      setReaderProvisionId(null)
      setReaderPoint(null)
      setReaderVersion(against)
      setPaneView('act')

      const outcome = await ask(text, {
        version: against,
        traversal: follow,
        signal: controller.signal,
        playback: play,
        onNode: (node) => {
          if (controller.signal.aborted) return
          setProgress(
            (current) => current && advance(current, node, Date.now()),
          )
        },
      })

      if (controller.signal.aborted) return

      // The invalid state renders on the input, which is on the landing page,
      // and never in the failure region, because the service never started
      // work on it.
      if (outcome.state === 'invalid') {
        setHandoff({ description: text, rejected: true })
        router.replace('/')
        return
      }

      setResult(outcome)
      setPending(false)
    },
    [router, setHandoff],
  )

  /**
   * Opens the page as the address or the handoff left it. Only the deployed
   * build holds a recorded question to reopen, and a version the address names
   * wins over the one the handoff carried.
   */
  const open = useCallback(
    (search: string) => {
      const address = readAddress(search)
      const recorded =
        REPLAY_MODE && address.question
          ? recordedDescriptionFor(address.question)
          : null

      if (recorded !== null) {
        const against = address.version ?? 'consolidated'
        setHandoff({ description: recorded, version: against, rejected: false })
        void run(recorded, against, true)
        if (address.provision) setReaderProvisionId(address.provision)
        return
      }

      if (handoff.description.trim() === '') {
        router.replace('/')
        return
      }

      const against = address.version ?? handoff.version
      if (address.version) setHandoff({ version: address.version })
      void run(handoff.description, against, handoff.traversal)
    },
    [handoff, router, run, setHandoff],
  )

  // The address is an external system read once, after hydration, because the
  // static export renders this page with no address at all.
  useEffect(() => {
    if (hasReadAddress.current) return
    hasReadAddress.current = true
    open(window.location.search)
  }, [open])

  const changeVersion = useCallback(
    (next: CorpusVersion) => {
      setHandoff({ version: next })
      if (asked !== null) void run(asked, next, traversal, false)
    },
    [asked, run, setHandoff, traversal],
  )

  const changeTraversal = useCallback(
    (next: boolean) => {
      setHandoff({ traversal: next })
      if (asked !== null) void run(asked, version, next)
    },
    [asked, run, setHandoff, version],
  )

  const edit = useCallback(() => {
    inFlight.current?.abort()
    if (asked !== null) setHandoff({ description: asked, rejected: false })
    router.push('/')
  }, [asked, router, setHandoff])

  const pick = useCallback(
    (recorded: string) => {
      setHandoff({ description: recorded, rejected: false })
      void run(recorded, version, traversal)
    },
    [run, setHandoff, traversal, version],
  )

  const answer =
    result?.state === 'answered' || result?.state === 'refused'
      ? result.answer
      : null
  const cited = useMemo(() => (answer ? citedIn(answer) : []), [answer])

  // The composer is on the landing page, so once something is asked the card
  // holds the version toggle, and the traversal switch sits in the bar at 1024
  // and wider and in the card below it.
  const traversalSwitch = (
    <TraversalSwitch
      traversal={traversal}
      onTraversalChange={changeTraversal}
      disabled={pending}
      traversalFixed={REPLAY_MODE}
    />
  )

  const openProvision = useCallback(
    (provisionId: string, provisionVersion: CorpusVersion, point?: string) => {
      setReaderVersion(provisionVersion)
      setReaderProvisionId(provisionId)
      setReaderPoint(point ?? null)
      setPaneView('act')
    },
    [],
  )

  const closeReader = useCallback(() => {
    setReaderProvisionId(null)
    setReaderPoint(null)
  }, [])

  // Docked, the Act opens on the first provision the answer cites until the
  // reader picks another, so the pane never starts at the top of Article 1.
  const paneProvisionId = readerProvisionId ?? cited[0]?.provisionId ?? null
  const shownProvisionId = answer
    ? docked
      ? paneProvisionId
      : readerProvisionId
    : null

  // Written only once something is asked, since this effect runs in the same
  // commit as the one reading the address, and writing then would replace a
  // shared link before the answer it names is back.
  useEffect(() => {
    if (asked === null) return
    const question = REPLAY_MODE ? recordedQuestionIdFor(asked) : null
    const search = addressSearch({
      question: question ?? undefined,
      version,
      provision: shownProvisionId ?? undefined,
    })
    const { pathname, hash } = window.location
    window.history.replaceState(
      window.history.state,
      '',
      `${pathname}${search}${hash}`,
    )
  }, [asked, shownProvisionId, version])

  const nextStep = result && isNextStepState(result.state) ? result.state : null
  const shownQuestionId = asked !== null ? recordedQuestionIdFor(asked) : null

  return (
    <div className="flex min-h-full flex-col bg-paper">
      <TopBar
        traversal={traversal}
        onTraversalChange={changeTraversal}
        disabled={pending}
        // The capture ran with reference following on, so a recording holds one
        // answer a question and the switch would return the same one either
        // way. Held inactive rather than removed, since the control is part of
        // what the recorded walkthrough demonstrates against the live system.
        traversalFixed={REPLAY_MODE}
        showTraversal={docked && asked !== null}
      />

      {REPLAY_MODE && (
        <ReplayNotice
          capturedOn={capturedOnFor(shownQuestionId, version)}
          specific={shownQuestionId !== null}
        />
      )}

      {asked !== null && (
        <div
          className={`flex-1 ${
            docked ? (answer ? ANSWER_SPLIT : `${SPLIT} gap-x-10`) : ''
          }`}
        >
          {/* The trace sits beside `main` rather than inside it. A footer nested
              in `main` is no longer a contentinfo landmark, which is what a
              screen reader and every e2e case find the cost line by. */}
          <div className="px-6 pb-12 lg:pl-8">
            <DescribedSystem
              description={asked}
              onEdit={edit}
              version={version}
              onVersionChange={changeVersion}
              pending={pending}
              traversal={docked ? undefined : traversalSwitch}
            />
            <main>
              {pending && REPLAY_MODE && (
                <p className="mt-6 mb-0 border-l-2 border-warning-rule bg-warning-surface px-3 py-2 text-[12.5px] text-ink">
                  Illustrative pace. These steps replay the recording{' '}
                  {PLAYBACK_SPEEDUP} times faster than it ran, and the times
                  beside them are this replay&apos;s, not the model&apos;s.
                </p>
              )}
              {pending && progress && (
                <AgentSteps progress={progress} version={version} />
              )}
              {result?.state === 'answered' && (
                <AnswerView
                  answer={result.answer}
                  onOpenProvision={openProvision}
                />
              )}
              {result?.state === 'refused' && result.answer.refusal && (
                <RefusalView
                  refusal={result.answer.refusal}
                  onOpenProvision={openProvision}
                />
              )}
              {(result?.state === 'unavailable' ||
                result?.state === 'timeout' ||
                result?.state === 'failed') && (
                <FailureRegion
                  state={result.state}
                  correlationId={result.correlationId}
                />
              )}
              {result?.state === 'unreachable' && (
                <FailureRegion state="unreachable" />
              )}
              {result?.state === 'unrecorded' && (
                <FailureRegion state="unrecorded" />
              )}
            </main>
            {answer && (
              <RetrievalTrace
                retrieval={answer.retrieval}
                version={answer.version}
                onOpenProvision={(provisionId) => {
                  openProvision(provisionId, answer.version)
                }}
                onOpenWalk={
                  docked
                    ? () => {
                        setPaneView('walk')
                      }
                    : undefined
                }
              />
            )}
          </div>
          {docked && answer && (
            <div className="sticky top-[var(--annex-bar-height,0px)] h-[calc(100vh-var(--annex-bar-height,0px))]">
              <ColumnHandle
                width={answerWidth}
                onWidthChange={setWidth}
                onReset={resetWidth}
              />
            </div>
          )}
          {docked && answer && (
            <ActReader
              docked
              version={readerVersion}
              openId={paneProvisionId}
              openPoint={readerPoint}
              cited={cited}
              citedAs={answer.refusal ? 'read' : 'cited'}
              onOpen={(provisionId) => {
                openProvision(provisionId, answer.version)
              }}
              walk={
                <Walk
                  retrieval={answer.retrieval}
                  version={answer.version}
                  onOpen={(provisionId) => {
                    openProvision(provisionId, answer.version)
                  }}
                />
              }
              view={paneView}
              onViewChange={setPaneView}
              onClose={closeReader}
              onVersionChange={setReaderVersion}
            />
          )}
          {docked && pending && progress && (
            <WaitPane
              key={progress.startedAt}
              progress={progress}
              version={version}
            />
          )}
          {docked && nextStep && (
            <FailureNextStep state={nextStep} onPick={pick} />
          )}
          {docked &&
            (result?.state === 'timeout' || result?.state === 'failed') && (
              <TermsPane />
            )}
        </div>
      )}

      {!docked && (
        <ActReader
          version={readerVersion}
          openId={readerProvisionId}
          openPoint={readerPoint}
          onClose={closeReader}
          onVersionChange={setReaderVersion}
        />
      )}
    </div>
  )
}
