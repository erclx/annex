'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import {
  ActReader,
  type CitedProvision,
  type PaneView,
} from '@/components/act-reader'
import { AgentSteps } from '@/components/agent-steps'
import { AnswerView } from '@/components/answer-view'
import { BeforeYouAsk } from '@/components/before-you-ask'
import { ColumnHandle } from '@/components/column-handle'
import { DescribedSystem } from '@/components/described-system'
import {
  type DescriptionError,
  DescriptionForm,
} from '@/components/description-form'
import {
  FailureNextStep,
  type NextStepState,
} from '@/components/failure-next-step'
import { FailureRegion } from '@/components/failure-region'
import { RecordedPicks } from '@/components/recorded-picks'
import { RefusalView } from '@/components/refusal-view'
import { ReplayNotice } from '@/components/replay-notice'
import { RetrievalTrace, Walk } from '@/components/retrieval-trace'
import { TopBar, TraversalSwitch, VersionToggle } from '@/components/top-bar'
import type { CorpusVersion } from '@/components/versions'
import { WaitPane } from '@/components/wait-pane'
import { addressSearch, readAddress } from '@/lib/address'
import type { Answer } from '@/lib/answer'
import { ask, type AskResult, MAXIMUM_DESCRIPTION } from '@/lib/ask'
import {
  recordedDescriptionFor,
  recordedQuestionIdFor,
  REPLAY_MODE,
} from '@/lib/replay'
import { PLAYBACK_SPEEDUP } from '@/lib/replay-playback'
import { useColumnWidth } from '@/lib/use-column-width'
import { useDocked } from '@/lib/use-docked'
import { advance, startProgress, type WalkProgress } from '@/lib/walk-progress'

/**
 * The empty state's measure beside the pane holding the terms, from
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

/** Which of the two validation messages a description earns, if any. */
function descriptionErrorFor(description: string): DescriptionError | null {
  const trimmed = description.trim()
  if (trimmed === '') return 'empty'
  if (trimmed.length > MAXIMUM_DESCRIPTION) return 'too-long'
  return null
}

function isNextStepState(state: AskResult['state']): state is NextStepState {
  return (
    state === 'unrecorded' || state === 'unavailable' || state === 'unreachable'
  )
}

/**
 * One surface carries the whole product.
 *
 * A visitor describes a system, and the same page becomes the answer, the
 * refusal, or the failure. At 1024 pixels and wider the Act is a region beside
 * the answer column rather than something over it, and below that width it is
 * an overlay, per `canon/wireframes/answer.md`. There is still no second
 * screen and no navigation.
 *
 * Every call to the service goes through `@/lib/ask` and nothing here touches
 * `fetch`. That is what makes the deployed build's swap to captured fixtures a
 * change to one module rather than to this file.
 */
export default function Home() {
  const docked = useDocked()
  const [description, setDescription] = useState('')
  const [asked, setAsked] = useState<string | null>(null)
  const [result, setResult] = useState<AskResult | null>(null)
  const [pending, setPending] = useState(false)
  const [progress, setProgress] = useState<WalkProgress | null>(null)
  const [touched, setTouched] = useState(false)
  const [version, setVersion] = useState<CorpusVersion>('consolidated')
  const [traversal, setTraversal] = useState(true)
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

  /**
   * Whether anything has been asked since the page opened. The address is
   * written only once something has, since the effect writing it runs in the
   * same commit as the one reading it, and writing an empty page then would
   * replace a shared link before the answer it names is back.
   */
  const hasAsked = useRef(false)

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
      setResult(outcome)
      setPending(false)
    },
    [],
  )

  /**
   * Opens the page as a shared address left it. Only the deployed build holds
   * a recorded question to reopen, and on either build a version carries
   * across, with a provision alongside a reopened answer.
   */
  const restoreAddress = useCallback(
    (search: string) => {
      const address = readAddress(search)
      const against = address.version ?? 'consolidated'
      const recorded =
        REPLAY_MODE && address.question
          ? recordedDescriptionFor(address.question)
          : null

      if (address.version) setVersion(address.version)
      if (recorded === null) return
      setDescription(recorded)
      void run(recorded, against, true)
      if (address.provision) setReaderProvisionId(address.provision)
    },
    [run],
  )

  // The address is an external system read once, after hydration, because the
  // static export renders this page with no address at all.
  useEffect(() => {
    if (hasReadAddress.current) return
    hasReadAddress.current = true
    restoreAddress(window.location.search)
  }, [restoreAddress])

  const submit = useCallback(() => {
    setTouched(true)
    if (descriptionErrorFor(description) !== null) return
    void run(description, version, traversal)
  }, [description, run, traversal, version])

  const changeVersion = useCallback(
    (next: CorpusVersion) => {
      setVersion(next)
      if (asked !== null) void run(asked, next, traversal, false)
    },
    [asked, run, traversal],
  )

  const changeTraversal = useCallback(
    (next: boolean) => {
      setTraversal(next)
      if (asked !== null) void run(asked, version, next)
    },
    [asked, run, version],
  )

  const edit = useCallback(() => {
    inFlight.current?.abort()
    setAsked(null)
    setResult(null)
    setPending(false)
  }, [])

  const rejected = result?.state === 'invalid'
  const answer =
    result?.state === 'answered' || result?.state === 'refused'
      ? result.answer
      : null
  const cited = useMemo(() => (answer ? citedIn(answer) : []), [answer])

  // A description the service rejected with a length the form would pass is
  // still named as empty, the one other reason the service gives `invalid`.
  const formError = rejected
    ? (descriptionErrorFor(description) ?? 'empty')
    : touched
      ? descriptionErrorFor(description)
      : null

  // The invalid state renders on the input and never in the failure region,
  // because the service never started work on it.
  const onForm = asked === null || rejected

  // Keyed on `onForm` rather than on whether anything was asked, since a
  // rejected submit keeps the form on screen with `asked` set, and keying the
  // bar on `asked` would mount a second set of choices beside the composer's.
  // Before an ask the composer holds both choices. After one the card holds
  // the version toggle, and the traversal switch sits in the bar at 1024 and
  // wider and in the card below it.
  const traversalSwitch = (
    <TraversalSwitch
      traversal={traversal}
      onTraversalChange={changeTraversal}
      disabled={pending}
      traversalFixed={REPLAY_MODE}
    />
  )

  const pick = useCallback(
    (recorded: string) => {
      setDescription(recorded)
      setTouched(false)
      void run(recorded, version, traversal)
    },
    [run, traversal, version],
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

  useEffect(() => {
    if (!hasReadAddress.current) return
    if (asked !== null) hasAsked.current = true
    if (!hasAsked.current) return
    const question =
      REPLAY_MODE && asked !== null ? recordedQuestionIdFor(asked) : null
    const search = addressSearch({
      question: question ?? undefined,
      version: asked !== null ? version : undefined,
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
        showTraversal={docked && !onForm}
        onHome={edit}
      />

      {REPLAY_MODE && <ReplayNotice />}

      {onForm ? (
        <div className={docked ? `${SPLIT} gap-x-10` : ''}>
          <div className="px-6 lg:pl-8">
            <DescriptionForm
              description={description}
              onDescriptionChange={(next) => {
                setDescription(next)
                setResult(null)
              }}
              onSubmit={submit}
              error={formError}
              pending={pending}
              choices={
                <>
                  <VersionToggle
                    version={version}
                    onVersionChange={changeVersion}
                    disabled={pending}
                  />
                  {traversalSwitch}
                </>
              }
            />
            <RecordedPicks onPick={pick} />
            {!docked && <BeforeYouAsk docked={false} />}
          </div>
          {docked && <BeforeYouAsk docked />}
        </div>
      ) : (
        <>
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
                <BeforeYouAsk docked />
              )}
          </div>
        </>
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
