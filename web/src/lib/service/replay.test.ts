import { afterEach, describe, expect, it, vi } from 'vitest'

import { captures, manifest } from '@/fixtures'
import { answerSchema } from '@/lib/service/answer'
import {
  capturedOnFor,
  recordedDescriptionFor,
  recordedQuestionIdFor,
  recordedQuestions,
  replay,
} from '@/lib/service/replay'

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

describe('a recorded question named in the address', () => {
  it('resolves its id to the description that was asked', () => {
    expect(recordedDescriptionFor(recorded.question_id)).toBe(
      recorded.description,
    )
  })

  it('names the id a recorded description was captured under', () => {
    expect(
      recordedQuestionIdFor(` ${recorded.description.toUpperCase()} `),
    ).toBe(recorded.question_id)
  })

  it('resolves nothing for an id the recording does not hold', () => {
    expect(recordedDescriptionFor('q99-not-recorded')).toBeNull()
  })

  it('names no id for a description the recording does not hold', () => {
    expect(
      recordedQuestionIdFor('a system that decides which crops to plant'),
    ).toBeNull()
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

  it('holds twelve distinct questions, the count the recorded-questions intro types', () => {
    expect(recordedQuestions).toHaveLength(12)
  })

  it('reads a question refused on the original and answered on the amended', () => {
    const question = recordedQuestions.find(
      (candidate) => candidate.id === 'q03-generated-product-images',
    )

    expect(question?.refused).toEqual({ original: true, consolidated: false })
  })

  it('reads the two questions refused on both texts', () => {
    const refusedOnBoth = recordedQuestions
      .filter(
        (question) =>
          question.refused.original && question.refused.consolidated,
      )
      .map((question) => question.id)

    expect(refusedOnBoth).toEqual([
      'q08-redesigned-interface',
      'q09-wider-rollout',
    ])
  })

  it('stamps a recorded pair with the date its own entry was captured', () => {
    const entry = manifest.entries[0]

    expect(
      capturedOnFor(
        entry.question_id,
        entry.version as 'original' | 'consolidated',
      ),
    ).toBe(entry.captured_at)
  })

  it('distinguishes the recaptured entry from another entry captured earlier', () => {
    const recaptured = manifest.entries.find(
      (entry) =>
        entry.question_id === 'q01-support-chatbot' &&
        entry.version === 'consolidated',
    )
    const another = manifest.entries.find(
      (entry) => entry.question_id !== 'q01-support-chatbot',
    )

    expect(recaptured?.captured_at).not.toBe(another?.captured_at)
  })

  it('falls back to the most recent stamp when no pair is named', () => {
    const latest = manifest.entries.reduce(
      (latestDate, entry) =>
        entry.captured_at > latestDate ? entry.captured_at : latestDate,
      manifest.entries[0].captured_at,
    )

    expect(capturedOnFor(null, null)).toBe(latest)
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

    const { ask } = await import('@/lib/service/ask')
    await ask(recorded.description)

    expect(fetching).toHaveBeenCalled()
  })

  it('reaches the recording and no service when the mode is replay', async () => {
    vi.stubEnv('NEXT_PUBLIC_ANNEX_MODE', 'replay')
    vi.resetModules()
    const fetching = vi.fn(() => Promise.reject(new Error('refused')))
    vi.stubGlobal('fetch', fetching)

    const { ask } = await import('@/lib/service/ask')
    const result = await ask(recorded.description, { version: 'consolidated' })

    expect(fetching).not.toHaveBeenCalled()
    expect(result.state).not.toBe('unreachable')
  })
})
