'use client'

import { useCallback, useMemo, useRef, useState } from 'react'

import {
  ActReader,
  type CitedProvision,
  type PaneView,
} from '@/components/act-reader'
import { AnswerView } from '@/components/answer-view'
import { BeforeYouAsk } from '@/components/before-you-ask'
import { DescribedSystem } from '@/components/described-system'
import { DescriptionForm } from '@/components/description-form'
import { FailureRegion } from '@/components/failure-region'
import { LoadingAnswer } from '@/components/loading-answer'
import { RecordedPicks } from '@/components/recorded-picks'
import { RefusalView } from '@/components/refusal-view'
import { ReplayNotice } from '@/components/replay-notice'
import { RetrievalTrace, Walk } from '@/components/retrieval-trace'
import { TopBar } from '@/components/top-bar'
import type { CorpusVersion } from '@/components/versions'
import type { Answer } from '@/lib/answer'
import { ask, type AskResult } from '@/lib/ask'
import { REPLAY_MODE } from '@/lib/replay'
import { useDocked } from '@/lib/use-docked'

/**
 * The answer column's measure beside a pane that takes the rest, from
 * `.claude/DESIGN.md` § Layout.
 */
const SPLIT = 'grid grid-cols-[minmax(0,640px)_minmax(420px,1fr)] items-start'

/** Every provision an answer or a refusal cites, once, in first-cited order. */
function citedIn(answer: Answer): CitedProvision[] {
  const citations = answer.refusal
    ? answer.refusal.consulted
    : answer.claims.flatMap((claim) => claim.citations)
  const seen = new Set<string>()
  return citations.flatMap((citation) => {
    if (seen.has(citation.provision_id)) return []
    seen.add(citation.provision_id)
    return [{ provisionId: citation.provision_id, label: citation.citation }]
  })
}

/**
 * One surface carries the whole product.
 *
 * A visitor describes a system, and the same page becomes the answer, the
 * refusal, or the failure. At 1024 pixels and wider the Act is a region beside
 * the answer column rather than something over it, and below that width it is
 * an overlay, per `.claude/wireframes/answer.md`. There is still no second
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
  const [touched, setTouched] = useState(false)
  const [version, setVersion] = useState<CorpusVersion>('consolidated')
  const [traversal, setTraversal] = useState(true)
  const [readerVersion, setReaderVersion] =
    useState<CorpusVersion>('consolidated')
  const [readerProvisionId, setReaderProvisionId] = useState<string | null>(
    null,
  )
  const [paneView, setPaneView] = useState<PaneView>('act')

  /**
   * The in-flight ask, so a re-ask replaces its answer rather than racing it.
   *
   * The version toggle and the traversal switch both re-ask, and an ask runs 21
   * to 28 seconds, so two can overlap by a wide margin. Without this the slower
   * of the two lands last and the surface shows an answer against the text the
   * reader just toggled away from.
   */
  const inFlight = useRef<AbortController | null>(null)

  const run = useCallback(
    async (text: string, against: CorpusVersion, follow: boolean) => {
      inFlight.current?.abort()
      const controller = new AbortController()
      inFlight.current = controller

      setAsked(text)
      setResult(null)
      setPending(true)
      setReaderProvisionId(null)
      setReaderVersion(against)
      setPaneView('act')

      const outcome = await ask(text, {
        version: against,
        traversal: follow,
        signal: controller.signal,
      })

      if (controller.signal.aborted) return
      setResult(outcome)
      setPending(false)
    },
    [],
  )

  const submit = useCallback(() => {
    setTouched(true)
    if (description.trim() === '') return
    void run(description, version, traversal)
  }, [description, run, traversal, version])

  const changeVersion = useCallback(
    (next: CorpusVersion) => {
      setVersion(next)
      if (asked !== null) void run(asked, next, traversal)
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

  // The invalid state renders on the input and never in the failure region,
  // because the service never started work on it.
  const onForm = asked === null || rejected

  const pick = useCallback(
    (recorded: string) => {
      setDescription(recorded)
      setTouched(false)
      void run(recorded, version, traversal)
    },
    [run, traversal, version],
  )

  const openProvision = useCallback(
    (provisionId: string, provisionVersion: CorpusVersion) => {
      setReaderVersion(provisionVersion)
      setReaderProvisionId(provisionId)
      setPaneView('act')
    },
    [],
  )

  const closeReader = useCallback(() => {
    setReaderProvisionId(null)
  }, [])

  // Docked, the Act opens on the first provision the answer cites until the
  // reader picks another, so the pane never starts at the top of Article 1.
  const paneProvisionId = readerProvisionId ?? cited[0]?.provisionId ?? null

  return (
    <div className="flex min-h-full flex-col bg-paper">
      <TopBar
        version={version}
        onVersionChange={changeVersion}
        traversal={traversal}
        onTraversalChange={changeTraversal}
        disabled={pending}
        // The capture ran with reference following on, so a recording holds one
        // answer a question and the switch would return the same one either
        // way. Held inactive rather than removed, since the control is part of
        // what the recorded walkthrough demonstrates against the live system.
        traversalFixed={REPLAY_MODE}
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
              onBlur={() => {
                setTouched(true)
              }}
              onSubmit={submit}
              invalid={rejected || (touched && description.trim() === '')}
              pending={pending}
            />
            <RecordedPicks onPick={pick} />
            {!docked && <BeforeYouAsk docked={false} />}
          </div>
          {docked && <BeforeYouAsk docked />}
        </div>
      ) : (
        <>
          <DescribedSystem description={asked} onEdit={edit} />
          <div className={`flex-1 ${docked ? `${SPLIT} gap-x-10` : ''}`}>
            {/* The trace sits beside `main` rather than inside it. A footer nested
                in `main` is no longer a contentinfo landmark, which is what a
                screen reader and every e2e case find the cost line by. */}
            <div className="px-6 pb-12 lg:pl-8">
              <main>
                {pending && <LoadingAnswer version={version} />}
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
              <ActReader
                docked
                version={readerVersion}
                openId={paneProvisionId}
                cited={cited}
                onOpen={(provisionId) => {
                  openProvision(provisionId, answer.version)
                }}
                walk={<Walk retrieval={answer.retrieval} />}
                view={paneView}
                onViewChange={setPaneView}
                onClose={closeReader}
                onVersionChange={setReaderVersion}
              />
            )}
          </div>
        </>
      )}

      {!docked && (
        <ActReader
          version={readerVersion}
          openId={readerProvisionId}
          onClose={closeReader}
          onVersionChange={setReaderVersion}
        />
      )}
    </div>
  )
}
