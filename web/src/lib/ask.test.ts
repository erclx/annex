import { afterEach, describe, expect, it, vi } from 'vitest'

import { ask } from '@/lib/ask'

const citation = {
  provision_id: 'art_50.1',
  citation: 'Article 50(1)',
  kind: 'paragraph',
  version: 'consolidated',
  text: 'Providers shall ensure that AI systems intended to interact directly with natural persons are informed.',
  changed: false,
  change_note: null,
}

function anAnswer(overrides: Record<string, unknown> = {}) {
  return {
    question: 'a customer chatbot',
    version: 'consolidated',
    claims: [
      {
        statement:
          'The chatbot has to tell the person they are interacting with an AI system.',
        citations: [citation],
      },
    ],
    refusal: null,
    retrieval: {
      searched_ids: ['art_50'],
      traversed_ids: [],
      dropped_ids: [],
      traversal_enabled: true,
      truncated: false,
      prompt_tokens: 7940,
      completion_tokens: 288,
      duration_ms: 12100,
      model: 'annex-qwen3-27b',
    },
    ...overrides,
  }
}

function respondWith(status: number, body: unknown) {
  const stub = vi.fn((_url: string, _init: RequestInit) =>
    Promise.resolve({
      ok: status >= 200 && status < 300,
      status,
      json: () => Promise.resolve(body),
    }),
  )
  vi.stubGlobal('fetch', stub)
  return stub
}

/** What the client actually put on the wire, as an object the test can read. */
function sentBody(
  stub: ReturnType<typeof respondWith>,
): Record<string, unknown> {
  const init = stub.mock.calls.at(-1)?.[1]
  return JSON.parse(String(init?.body)) as Record<string, unknown>
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('the two results that carry an answer', () => {
  it('reads claims on a 200 as answered', async () => {
    respondWith(200, anAnswer())

    const result = await ask('a customer chatbot')

    expect(result.state).toBe('answered')
  })

  it('reads a populated refusal on a 200 as refused and not as a failure', async () => {
    respondWith(
      200,
      anAnswer({
        claims: [],
        refusal: {
          reason: 'The Act never defines the threshold.',
          missing: ['what counts as a substantial modification'],
          consulted: [citation],
        },
      }),
    )

    const result = await ask('quarterly retraining')

    expect(result.state).toBe('refused')
  })
})

describe('the five failures', () => {
  it('reads a 422 as invalid, without a correlation id', async () => {
    respondWith(422, {
      state: 'invalid',
      detail: 'The description was empty or past the length bound.',
    })

    const result = await ask('')

    expect(result).toEqual({
      state: 'invalid',
      detail: 'The description was empty or past the length bound.',
    })
  })

  it('reads a 503 as unavailable, carrying the correlation id', async () => {
    respondWith(503, {
      state: 'unavailable',
      detail: 'The service is up and could not reach the model or the index.',
      correlationId: '8f2a-41d7',
    })

    const result = await ask('a customer chatbot')

    expect(result.state).toBe('unavailable')
    expect(result).toHaveProperty('correlationId', '8f2a-41d7')
  })

  it('reads a 504 as timeout', async () => {
    respondWith(504, {
      state: 'timeout',
      detail: 'The model did not answer inside the budget.',
      correlationId: '8f2a-41d7',
    })

    const result = await ask('a customer chatbot')

    expect(result.state).toBe('timeout')
  })

  it('reads a 500 as failed', async () => {
    respondWith(500, {
      state: 'failed',
      detail: 'Something went wrong that we did not expect.',
      correlationId: '8f2a-41d7',
    })

    const result = await ask('a customer chatbot')

    expect(result.state).toBe('failed')
  })

  it('reads a rejected fetch as unreachable', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(new TypeError('Failed to fetch'))),
    )

    const result = await ask('a customer chatbot')

    expect(result).toEqual({ state: 'unreachable' })
  })

  it('reads an aborted fetch as timeout rather than unreachable', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        (_url: string, init: { signal: AbortSignal }) =>
          new Promise((_resolve, reject) => {
            init.signal.addEventListener('abort', () => {
              reject(new DOMException('Aborted', 'AbortError'))
            })
          }),
      ),
    )
    const caller = new AbortController()

    const pending = ask('a customer chatbot', { signal: caller.signal })
    caller.abort()

    expect((await pending).state).toBe('timeout')
  })
})

describe('the boundary parse', () => {
  it('reads a body the schema rejects as failed', async () => {
    respondWith(200, { question: 'a chatbot', version: 'draft' })

    const result = await ask('a customer chatbot')

    expect(result.state).toBe('failed')
  })

  it('reads an unknown field on the answer as failed, since the schema is strict', async () => {
    respondWith(200, anAnswer({ confidence: 0.9 }))

    const result = await ask('a customer chatbot')

    expect(result.state).toBe('failed')
  })

  it('reads an error body the schema rejects as failed', async () => {
    respondWith(503, { message: 'nope' })

    const result = await ask('a customer chatbot')

    expect(result.state).toBe('failed')
  })
})

describe('what the request carries', () => {
  it('sends the description, the version and the traversal switch', async () => {
    const stub = respondWith(200, anAnswer())

    await ask('a CV screening tool', { version: 'original', traversal: false })

    expect(sentBody(stub)).toEqual({
      description: 'a CV screening tool',
      version: 'original',
      traversal: false,
    })
  })

  it('defaults to the consolidated text with traversal on', async () => {
    const stub = respondWith(200, anAnswer())

    await ask('a customer chatbot')

    const sent = sentBody(stub)
    expect(sent.version).toBe('consolidated')
    expect(sent.traversal).toBe(true)
  })
})
