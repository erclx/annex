import { describe, expect, it, vi } from 'vitest'

import { readStreamedAnswer } from '@/lib/service/stream'

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
      searched_ids: ['art_50.1'],
      traversed_ids: ['art_50'],
      dropped_ids: [],
      uncited_ids: [],
      edges: [{ source_id: 'art_50.1', target_id: 'art_50', hop: 0 }],
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

function frame(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
}

/** A body delivering the given text in the given pieces, then closing. */
function bodyOf(...pieces: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder()
  return new ReadableStream({
    start(controller) {
      for (const piece of pieces) controller.enqueue(encoder.encode(piece))
      controller.close()
    },
  })
}

describe('readStreamedAnswer', () => {
  it('hands each node frame over in the order it arrived', async () => {
    const onNode = vi.fn()
    const body = bodyOf(
      frame('node', { node: 'route' }),
      frame('node', { node: 'retrieve', searched_ids: ['art_50.1'] }),
      frame('answer', anAnswer()),
    )

    await readStreamedAnswer(body, onNode)

    expect(onNode.mock.calls.map(([node]) => node.node)).toEqual([
      'route',
      'retrieve',
    ])
    expect(onNode.mock.calls[1][0].searched_ids).toEqual(['art_50.1'])
  })

  it('reads a frame split across two chunks as one frame', async () => {
    const onNode = vi.fn()
    const whole = frame('node', { node: 'traverse', traversed_ids: ['art_50'] })
    const body = bodyOf(
      whole.slice(0, 17),
      whole.slice(17),
      frame('answer', anAnswer()),
    )

    await readStreamedAnswer(body, onNode)

    expect(onNode).toHaveBeenCalledWith(
      expect.objectContaining({ node: 'traverse', traversed_ids: ['art_50'] }),
    )
  })

  it('ends answered on an answer frame carrying claims', async () => {
    const result = await readStreamedAnswer(
      bodyOf(frame('answer', anAnswer())),
      vi.fn(),
    )

    expect(result.state).toBe('answered')
  })

  it('ends refused on an answer frame carrying a refusal', async () => {
    const refused = anAnswer({
      claims: [],
      refusal: {
        reason: 'The Act never defines the threshold.',
        missing: ['what counts as a substantial modification'],
        consulted: [citation],
      },
    })

    const result = await readStreamedAnswer(
      bodyOf(frame('answer', refused)),
      vi.fn(),
    )

    expect(result.state).toBe('refused')
  })

  it('maps an error frame into the state it names, with its correlation id', async () => {
    const body = bodyOf(
      frame('node', { node: 'route' }),
      frame('error', {
        state: 'timeout',
        detail: 'x',
        correlationId: '8f2a-41d7',
      }),
    )

    const result = await readStreamedAnswer(body, vi.fn())

    expect(result).toEqual({
      state: 'timeout',
      detail: 'x',
      correlationId: '8f2a-41d7',
    })
  })

  it('reads a body that closes with no answer frame as failed', async () => {
    const result = await readStreamedAnswer(
      bodyOf(frame('node', { node: 'route' })),
      vi.fn(),
    )

    expect(result.state).toBe('failed')
  })

  it('reads a frame carrying a field this build does not know as failed', async () => {
    const onNode = vi.fn()

    const result = await readStreamedAnswer(
      bodyOf(frame('node', { node: 'route', surprise: true })),
      onNode,
    )

    expect(result.state).toBe('failed')
    expect(onNode).not.toHaveBeenCalled()
  })
})
