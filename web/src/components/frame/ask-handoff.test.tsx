import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { AskHandoffProvider } from '@/components/frame/ask-handoff'
import {
  type KeptAnswer,
  useAskHandoff,
  useKeptAnswer,
} from '@/lib/browser/ask-handoff'

function Writer() {
  const { setHandoff } = useAskHandoff()
  return (
    <button
      type="button"
      onClick={() => {
        setHandoff({
          description: 'a customer chatbot',
          version: 'original',
          traversal: false,
        })
      }}
    >
      Write
    </button>
  )
}

function Reader() {
  const { handoff } = useAskHandoff()
  return (
    <output>
      {`${handoff.description}|${handoff.version}|${String(handoff.traversal)}|${String(handoff.rejected)}`}
    </output>
  )
}

const A_KEPT_ANSWER: KeptAnswer = {
  key: {
    description: 'a customer chatbot',
    version: 'original',
    traversal: false,
  },
  result: {
    state: 'answered',
    answer: {
      question: 'a customer chatbot',
      version: 'original',
      claims: [],
      refusal: null,
      retrieval: {
        searched_ids: [],
        traversed_ids: [],
        dropped_ids: [],
        edges: [],
        uncited_ids: [],
        traversal_enabled: false,
        truncated: false,
        prompt_tokens: 0,
        completion_tokens: 0,
        duration_ms: 0,
        model: 'annex-qwen3-27b',
      },
    },
  },
  provisionId: 'art_50',
  point: null,
  pageScrollY: 240,
  paneScrollTop: 1180,
}

function KeptAnswerWriter() {
  const { setKeptAnswer } = useKeptAnswer()
  return (
    <button
      type="button"
      onClick={() => {
        setKeptAnswer(A_KEPT_ANSWER)
      }}
    >
      Keep
    </button>
  )
}

function KeptAnswerReader() {
  const { keptAnswer } = useKeptAnswer()
  return <output>{keptAnswer ? keptAnswer.provisionId : 'none'}</output>
}

describe('AskHandoffProvider', () => {
  it('should read a value written on one consumer back on another', async () => {
    render(
      <AskHandoffProvider>
        <Writer />
        <Reader />
      </AskHandoffProvider>,
    )

    await userEvent.click(screen.getByRole('button', { name: 'Write' }))

    expect(screen.getByRole('status')).toHaveTextContent(
      'a customer chatbot|original|false|false',
    )
  })

  it('should read the defaults on a consumer nothing was written for', () => {
    render(
      <AskHandoffProvider>
        <Reader />
      </AskHandoffProvider>,
    )

    expect(screen.getByRole('status')).toHaveTextContent(
      '|consolidated|true|false',
    )
  })

  it('should refuse a consumer rendered outside the provider', () => {
    expect(() => render(<Reader />)).toThrow(/AskHandoffProvider/)
  })

  it('should read a kept answer written on one consumer back on another', async () => {
    render(
      <AskHandoffProvider>
        <KeptAnswerWriter />
        <KeptAnswerReader />
      </AskHandoffProvider>,
    )

    expect(screen.getByRole('status')).toHaveTextContent('none')
    await userEvent.click(screen.getByRole('button', { name: 'Keep' }))

    expect(screen.getByRole('status')).toHaveTextContent('art_50')
  })
})
