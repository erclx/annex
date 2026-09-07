import { afterEach, describe, expect, it, vi } from 'vitest'

import { captures, manifest } from '@/fixtures'
import { answerSchema } from '@/lib/answer'
import { capturedOn, recordedQuestions, replay } from '@/lib/replay'

const recorded = manifest.entries[0]

describe('what the recording holds', () => {
  it('answers a captured description with the answer that was captured', () => {
    const result = replay(recorded.description, {
      version: recorded.version as 'original' | 'consolidated',
    })

    expect(result.state === 'answered' || result.state === 'refused').toBe(true)
  })

  it('answers the same description differently per version', () => {
    // Both versions are captured for every question, and the version toggle is
    // the demo's version comparison. A replay that ignored the option would
    // return one text's answer for both.
    const original = replay(recorded.description, { version: 'original' })
    const consolidated = replay(recorded.description, {
      version: 'consolidated',
    })

    expect(original.state).not.toBe('unrecorded')
    expect(consolidated.state).not.toBe('unrecorded')
  })

  it('carries the description back on the answer it returns', () => {
    const result = replay(recorded.description, { version: 'consolidated' })

    expect(result.state === 'answered' || result.state === 'refused').toBe(true)
    if (result.state === 'answered' || result.state === 'refused') {
      expect(result.answer.question).toBe(recorded.description)
    }
  })

  it('matches a description whose spacing and case were changed', () => {
    const retyped = `  ${recorded.description.toUpperCase()}  `

    const result = replay(retyped, {
      version: recorded.version as 'original' | 'consolidated',
    })

    expect(result.state).not.toBe('unrecorded')
  })
})

describe('what the recording does not hold', () => {
  it('returns the unrecorded state rather than the nearest fixture', () => {
    const result = replay('a system that decides which crops to plant')

    expect(result.state).toBe('unrecorded')
  })

  it('returns the unrecorded state for an empty description', () => {
    expect(replay('').state).toBe('unrecorded')
  })
})

describe('the committed fixtures', () => {
  it('parses every captured answer against the generated schema', () => {
    // The strict parse is what makes a field added to the Pydantic models and
    // never re-captured a failing check rather than a gap on a deployed page.
    for (const entry of manifest.entries) {
      const key = `${entry.question_id}.${entry.version}`
      expect(answerSchema.safeParse(captures[key]).success).toBe(true)
    }
  })

  it('holds a fixture for every entry the manifest names', () => {
    for (const entry of manifest.entries) {
      expect(captures[`${entry.question_id}.${entry.version}`]).toBeDefined()
    }
  })

  it('offers each recorded question once rather than once per version', () => {
    const descriptions = recordedQuestions.map(
      (question) => question.description,
    )

    expect(new Set(descriptions).size).toBe(descriptions.length)
  })

  it('stamps the capture with the date it ran', () => {
    expect(capturedOn).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('offers every recorded question, whatever flow it carries', () => {
    // The picks group by flow, and grouping from a hand-written label map
    // instead dropped a question whose flow the map did not carry. The gold set
    // is a file another row adds to, so that loss would have been silent.
    const grouped = [
      ...new Set(recordedQuestions.map((question) => question.flow)),
    ].flatMap((flow) =>
      recordedQuestions.filter((question) => question.flow === flow),
    )

    expect(grouped).toHaveLength(recordedQuestions.length)
  })
})

describe('which path a build takes', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.resetModules()
  })

  it('reaches the service when the mode is unset', async () => {
    vi.stubEnv('NEXT_PUBLIC_ANNEX_MODE', '')
    vi.resetModules()
    const fetching = vi.fn(() => Promise.reject(new Error('refused')))
    vi.stubGlobal('fetch', fetching)

    const { ask } = await import('@/lib/ask')
    await ask(recorded.description)

    expect(fetching).toHaveBeenCalled()
  })

  it('reaches the recording and no service when the mode is replay', async () => {
    vi.stubEnv('NEXT_PUBLIC_ANNEX_MODE', 'replay')
    vi.resetModules()
    const fetching = vi.fn(() => Promise.reject(new Error('refused')))
    vi.stubGlobal('fetch', fetching)

    const { ask } = await import('@/lib/ask')
    const result = await ask(recorded.description, { version: 'consolidated' })

    expect(fetching).not.toHaveBeenCalled()
    expect(result.state).not.toBe('unreachable')
  })
})
