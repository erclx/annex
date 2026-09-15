'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import {
  ActReader,
  type CitedProvision,
  type PaneView,
} from '@/components/act/act-reader'
import { AnswerView } from '@/components/answer/answer-view'
import { DescribedSystem } from '@/components/answer/described-system'
import { RefusalView } from '@/components/answer/refusal-view'
import { RetrievalTrace, Walk } from '@/components/answer/retrieval-trace'
import { ColumnHandle } from '@/components/frame/column-handle'
import { ReplayNotice } from '@/components/frame/replay-notice'
import { TopBar, TraversalSwitch } from '@/components/frame/top-bar'
import { TermsPane } from '@/components/shared/terms-pane'
import type { CorpusVersion } from '@/components/shared/versions'
import { AgentSteps } from '@/components/status/agent-steps'
import {
  FailureNextStep,
  type NextStepState,
} from '@/components/status/failure-next-step'
import { FailureRegion } from '@/components/status/failure-region'
import { WaitPane } from '@/components/status/wait-pane'
import { addressSearch, readAddress } from '@/lib/browser/address'
import {
  type KeptAnswer,
  type KeptAnswerKey,
  keptAnswerMatches,
  useAskHandoff,
  useKeptAnswer,
} from '@/lib/browser/ask-handoff'
import { useColumnWidth } from '@/lib/browser/use-column-width'
import { useDocked } from '@/lib/browser/use-docked'
import type { Answer } from '@/lib/service/answer'
import { ask, type AskResult } from '@/lib/service/ask'
import {
  capturedOnFor,
  recordedDescriptionFor,
  recordedQuestionIdFor,
  REPLAY_MODE,
} from '@/lib/service/replay'
import { PLAYBACK_SPEEDUP } from '@/lib/service/replay-playback'
import {
  advance,
  startProgress,
  type WalkProgress,
} from '@/lib/service/walk-progress'

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
 * How many animation frames `restoreKeptAnswer` waits for the docked Act
 * pane to grow tall enough for its stored offset before writing anyway. 30
 * frames is roughly half a second at 60Hz, well past what the reproduction
 * needed, while still bounded so a kept answer shorter than its own offset
 * settles rather than waiting forever.
 */
const RESTORE_SCROLL_FRAME_BUDGET = 30

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
 * Every call to the service goes through `@/lib/service/ask` and nothing here touches
 * `fetch`. That is what makes the deployed build's swap to captured fixtures a
 * change to one module rather than to this file.
 */
export default function Ask() {
  const router = useRouter()
  const docked = useDocked()
  const { handoff, setHandoff } = useAskHandoff()
  const { keptAnswer, setKeptAnswer } = useKeptAnswer()
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
   * A pane scroll offset a restore is about to apply, handed to the pane as
   * a prop. Left in place once applied rather than cleared, since the pane
   * itself only reapplies a value that actually changes, per its own prop.
   */
  const [pendingRestore, setPendingRestore] = useState<{
    paneScrollTop: number
  } | null>(null)

  /** The latest read of each scroll position, kept current between renders. */
  const pageScrollRef = useRef(0)
  const paneScrollRef = useRef(0)

  /**
   * Set once a link press has frozen `pageScrollRef` for the leave in
   * progress, so the scroll listener stops overwriting it with the app
   * router's own scroll-to-top for that same transition, which still fires
   * as a real scroll event while this page is mounted. Cleared on mount,
   * and by `pageScrollThaw` below on a press that never became a leave.
   */
  const pageScrollFrozen = useRef(false)

  /** Releases a freeze the pressed link never turned into a navigation. */
  const pageScrollThaw = useRef(0)

  /**
   * The kept-answer entry this session would leave behind, current as of the
   * last settled result or reader pick, and flushed with the latest scroll
   * offsets on leaving.
   */
  const keptSnapshotRef = useRef<KeptAnswer | null>(null)

  /**
   * The restore's own deferred scroll write, so leaving again before it has
   * run cancels it rather than letting it write `scrollTop` on whatever page
   * replaced this one.
   */
  const reassertFrame = useRef(0)

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
  //
  // The kept-answer entry is flushed here too, with the latest scroll
  // offsets folded in: `keptSnapshotRef` is null until a result first
  // settles, so the rehearsed unmount strict mode runs straight after mount
  // writes nothing, the same reason the address mark is safe to reset there.
  useEffect(() => {
    const flights = inFlight
    const addressRead = hasReadAddress
    return () => {
      flights.current?.abort()
      addressRead.current = false
      cancelAnimationFrame(reassertFrame.current)
      clearTimeout(pageScrollThaw.current)
      if (keptSnapshotRef.current) {
        setKeptAnswer({
          ...keptSnapshotRef.current,
          pageScrollY: pageScrollRef.current,
          paneScrollTop: paneScrollRef.current,
        })
      }
    }
  }, [setKeptAnswer])

  // Kept current from a scroll listener, per the risk this plan names: the
  // app router may render the next route before this one unmounts, so an
  // offset read only in the cleanup above can read whatever the new page
  // already scrolled to. Written directly rather than through a
  // `requestAnimationFrame` throttle, since a scroll firing faster than
  // frames arrive can cancel and reschedule that callback indefinitely and
  // never once let it run, and the write itself is a plain ref assignment
  // cheap enough to need no throttle.
  useEffect(() => {
    function handleScroll() {
      if (pageScrollFrozen.current) return
      pageScrollRef.current = window.scrollY
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', handleScroll)
    }
  }, [])

  // The risk above understates the race: leaving through a link such as
  // `Evaluation` has the app router scroll this page to the top as part of
  // starting that transition, while this page is still mounted, and that
  // reset fires as a real scroll event the listener above cannot tell from
  // the reader's own scrolling. By the time the cleanup two effects up
  // reads it, the value it reads is the reset's rather than the reader's,
  // since the reset lands before the unmount does. A capture-phase listener
  // on a link's own pointer press freezes `pageScrollRef` at whatever the
  // offset is at that instant, ahead of the click that would start the
  // transition and the reset that rides along with it, and flushes the kept
  // entry with the same value so a session that never remounts still keeps
  // the reader's own position rather than nothing. Scoped to a link rather
  // than every pointer press anywhere in the document, since selecting
  // text, toggling the theme and opening a citation none of them start a
  // navigation and none needs this freeze.
  //
  // A press does not always turn into a leave: a middle-click or a
  // modifier-click opens a new tab and this page stays put, and so does a
  // press released away from the link. Left frozen, the scroll listener
  // would stay dead for the rest of this mount's life, keeping a stale
  // offset on whatever leave eventually happens. A short timeout thaws it
  // when no unmount claimed the freeze first, and a real leave's own
  // cleanup clears the pending timeout so it never fires against the next
  // page.
  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (!(event.target instanceof Element)) return
      if (!event.target.closest('a')) return
      pageScrollRef.current = window.scrollY
      pageScrollFrozen.current = true
      clearTimeout(pageScrollThaw.current)
      pageScrollThaw.current = window.setTimeout(() => {
        pageScrollFrozen.current = false
      }, 1000)
      if (!keptSnapshotRef.current) return
      setKeptAnswer({
        ...keptSnapshotRef.current,
        pageScrollY: window.scrollY,
        paneScrollTop: paneScrollRef.current,
      })
    }
    document.addEventListener('pointerdown', handlePointerDown, {
      capture: true,
    })
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown, {
        capture: true,
      })
    }
  }, [setKeptAnswer])

  const handlePaneScrollChange = useCallback((scrollTop: number) => {
    paneScrollRef.current = scrollTop
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
   * Shows a kept answer matching `key` instead of asking again: the claims,
   * the reader's provision, and both scroll offsets, docked. Below 1024 the
   * overlay stays closed, per the operator's pick, since one reopened on
   * arrival would hide the answer the reader came back for.
   */
  const restoreKeptAnswer = useCallback(
    (kept: KeptAnswer, description: string) => {
      setAsked(description)
      setResult(kept.result)
      setReaderVersion(kept.result.answer.version)
      setReaderProvisionId(docked ? kept.provisionId : null)
      setReaderPoint(docked ? kept.point : null)
      setPaneView('act')
      keptSnapshotRef.current = kept
      setPendingRestore({ paneScrollTop: docked ? kept.paneScrollTop : 0 })

      // The pane offset above reaches the pane as a prop and that component
      // applies it from its own effect. The page offset has no such
      // component to hand it to, so it is applied directly here.
      //
      // `document.documentElement.scrollTop` rather than `window.scrollTo`:
      // measured as more reliable against a real back navigation, and the
      // mount effect in `ask-handoff.tsx` takes the app router's own scroll
      // handling out of the race by setting `history.scrollRestoration =
      // 'manual'`, so nothing else is left writing the offset this restore
      // writes. What still races this write is layout rather than another
      // writer: the docked Act pane's content can take more than the one
      // frame a single `requestAnimationFrame` assumed, so a write landing
      // on a document still shorter than `pageScrollY` clamped to 0 and
      // nothing ever corrected it, reproduced locally in roughly half of
      // repeated runs against the recorded build. Retrying across frames
      // until the document can actually hold the offset, bounded so a
      // kept answer shorter than its own offset still settles, is what
      // closes that gap. The unmount cleanup cancels `reassertFrame` in
      // case no frame in the budget has run yet when the reader leaves
      // again.
      const pageScrollY = kept.pageScrollY
      let framesLeft = RESTORE_SCROLL_FRAME_BUDGET
      const tryRestore = () => {
        const maxScrollY =
          document.documentElement.scrollHeight - window.innerHeight
        framesLeft -= 1
        if (maxScrollY < pageScrollY && framesLeft > 0) {
          reassertFrame.current = requestAnimationFrame(tryRestore)
          return
        }
        document.documentElement.scrollTop = pageScrollY
        pageScrollRef.current = pageScrollY
      }
      reassertFrame.current = requestAnimationFrame(tryRestore)
    },
    [docked],
  )

  /**
   * Opens the page as the address or the handoff left it. Only the deployed
   * build holds a recorded question to reopen, and a version the address names
   * wins over the one the handoff carried.
   *
   * A kept answer matching what this open would otherwise ask for takes
   * precedence over both the recorded-replay path and the ordinary ask, so a
   * return to a settled question shows it rather than replaying or asking
   * again. A shared link opened fresh, with nothing kept, still replays or
   * asks as it does today.
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
        const key: KeptAnswerKey = {
          description: recorded,
          version: against,
          traversal: true,
        }
        if (keptAnswer && keptAnswerMatches(keptAnswer.key, key)) {
          restoreKeptAnswer(keptAnswer, recorded)
          return
        }
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
      const key: KeptAnswerKey = {
        description: handoff.description,
        version: against,
        traversal: handoff.traversal,
      }
      if (keptAnswer && keptAnswerMatches(keptAnswer.key, key)) {
        restoreKeptAnswer(keptAnswer, handoff.description)
        return
      }

      if (address.version) setHandoff({ version: address.version })
      void run(handoff.description, against, handoff.traversal)
    },
    [handoff, keptAnswer, restoreKeptAnswer, router, run, setHandoff],
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
  //
  // A raw `window.history.replaceState` rather than `router.replace`: the
  // router's own version was tried first, on the theory that a raw call
  // leaves its attached history state pointing at the entry's original URL
  // and the router's own restoration on a later back action reads that
  // stale state back. It measured worse rather than better, breaking the
  // back action's ordinary return to `/` in `web/e2e/replay.spec.ts`. What
  // actually dropped `p=` on the way back is `restoreKeptAnswer` below
  // supplying the restored provision late, not this write.
  useEffect(() => {
    if (asked === null) return
    const question = REPLAY_MODE ? recordedQuestionIdFor(asked) : null
    const search = addressSearch({
      question: question ?? undefined,
      version,
      provision: shownProvisionId ?? undefined,
    })
    const { pathname: currentPath, hash } = window.location
    window.history.replaceState(
      window.history.state,
      '',
      `${currentPath}${search}${hash}`,
    )
  }, [asked, shownProvisionId, version])

  // Written once a result settles, so a return before anything else changes
  // already has something to restore. The unmount cleanup further up folds
  // in the latest scroll offsets, and any later reader pick, before this
  // session ends.
  useEffect(() => {
    if (asked === null) return
    if (result === null) return
    if (result.state !== 'answered' && result.state !== 'refused') return
    const kept: KeptAnswer = {
      key: { description: asked, version, traversal },
      result,
      provisionId: shownProvisionId,
      point: readerPoint,
      pageScrollY: pageScrollRef.current,
      paneScrollTop: paneScrollRef.current,
    }
    keptSnapshotRef.current = kept
    setKeptAnswer(kept)
  }, [
    asked,
    readerPoint,
    result,
    setKeptAnswer,
    shownProvisionId,
    traversal,
    version,
  ])

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
            <div className="sticky top-(--annex-bar-height) h-[calc(100vh-var(--annex-bar-height,0px))]">
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
              restoreScrollTop={pendingRestore?.paneScrollTop ?? null}
              onScrollChange={handlePaneScrollChange}
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
