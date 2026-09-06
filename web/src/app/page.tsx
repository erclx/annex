'use client'

import { useCallback, useRef, useState } from 'react'

import { AnswerView } from '@/components/answer-view'
import { DescribedSystem } from '@/components/described-system'
import { DescriptionForm } from '@/components/description-form'
import { FailureRegion } from '@/components/failure-region'
import { LoadingAnswer } from '@/components/loading-answer'
import { RefusalView } from '@/components/refusal-view'
import { RetrievalTrace } from '@/components/retrieval-trace'
import { TopBar } from '@/components/top-bar'
import type { CorpusVersion } from '@/components/versions'
import { ask, type AskResult } from '@/lib/ask'

/**
 * One surface carries the whole product.
 *
 * A visitor describes a system, and the same page becomes the answer, the
 * refusal, or the failure. There is no second screen and no navigation, per
 * `.claude/wireframes/answer.md`.
 *
 * Every call to the service goes through `@/lib/ask` and nothing here touches
 * `fetch`. That is what makes the deployed build's swap to captured fixtures a
 * change to one module rather than to this file.
 */
export default function Home() {
  const [description, setDescription] = useState('')
  const [asked, setAsked] = useState<string | null>(null)
  const [result, setResult] = useState<AskResult | null>(null)
  const [pending, setPending] = useState(false)
  const [touched, setTouched] = useState(false)
  const [version, setVersion] = useState<CorpusVersion>('consolidated')
  const [traversal, setTraversal] = useState(true)

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

  // The invalid state renders on the input and never in the failure region,
  // because the service never started work on it.
  const onForm = asked === null || rejected

  return (
    <div className="flex min-h-full flex-col bg-paper">
      <TopBar
        version={version}
        onVersionChange={changeVersion}
        traversal={traversal}
        onTraversalChange={changeTraversal}
        disabled={pending}
      />

      {onForm ? (
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
      ) : (
        <>
          <DescribedSystem description={asked} onEdit={edit} />
          <main className="mx-auto w-full max-w-3xl flex-1 px-6">
            {pending && <LoadingAnswer version={version} />}
            {result?.state === 'answered' && (
              <AnswerView answer={result.answer} />
            )}
            {result?.state === 'refused' && result.answer.refusal && (
              <RefusalView refusal={result.answer.refusal} />
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
          </main>
          {answer && <RetrievalTrace retrieval={answer.retrieval} />}
        </>
      )}
    </div>
  )
}
