import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import Home from '@/app/page'

const citation = {
  provision_id: 'art_50.1',
  citation: 'Article 50(1)',
  kind: 'paragraph',
  version: 'consolidated',
  text: 'Providers shall ensure that AI systems intended to interact directly with natural persons are informed.',
  changed: false,
  change_note: null,
}

const trace = {
  searched_ids: ['art_50', 'art_50.1'],
  traversed_ids: ['art_50.2'],
  dropped_ids: [],
  traversal_enabled: true,
  truncated: false,
  prompt_tokens: 18420,
  completion_tokens: 612,
  duration_ms: 21300,
  model: 'annex-qwen3-27b',
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
    retrieval: trace,
    ...overrides,
  }
}

function respondWith(status: number, body: unknown) {
  vi.stubGlobal(
    'fetch',
    vi.fn(() =>
      Promise.resolve({
        ok: status >= 200 && status < 300,
        status,
        json: () => Promise.resolve(body),
      }),
    ),
  )
}

/** What the surface last put on the wire, as an object the test can read. */
function lastSent(): Record<string, unknown> {
  const init = vi.mocked(fetch).mock.calls.at(-1)?.[1]
  return JSON.parse(String(init?.body)) as Record<string, unknown>
}

async function describeSystem(text = 'a customer chatbot') {
  const user = userEvent.setup()
  await user.type(screen.getByLabelText('Describe your system'), text)
  await user.click(screen.getByRole('button', { name: 'Find the articles' }))
  return user
}

afterEach(() => {
  vi.unstubAllGlobals()
  // The theme control writes to the document and the store, both of which
  // outlive a render, so a test that changed either would leak into the next.
  delete document.documentElement.dataset.theme
  localStorage.clear()
})

describe('the empty state', () => {
  it('states what the tool does before anything is asked', () => {
    render(<Home />)

    expect(
      screen.getByText(/Describe what you are building/),
    ).toBeInTheDocument()
  })

  it('says it does not tell you whether you comply', () => {
    render(<Home />)

    expect(
      screen.getByText(/It does not tell you whether you comply/),
    ).toBeInTheDocument()
  })

  it('offers the recorded picks without replay mode on', () => {
    render(<Home />)

    expect(
      screen.getByText('Or read one of the recorded questions'),
    ).toBeInTheDocument()
  })

  it('gathers the load-bearing terms into a strip', () => {
    render(<Home />)

    expect(screen.getByText('Terms used on this page')).toBeInTheDocument()
    expect(screen.getByText('High risk')).toBeInTheDocument()
  })
})

describe('the invalid state', () => {
  it('renders on the input once an empty description has been left', async () => {
    render(<Home />)
    const user = userEvent.setup()

    await user.click(screen.getByLabelText('Describe your system'))
    await user.tab()

    expect(
      screen.getByText('A description is needed before this can be answered.'),
    ).toBeInTheDocument()
  })

  it('shows nothing on a field nobody has touched', () => {
    render(<Home />)

    expect(
      screen.queryByText(
        'A description is needed before this can be answered.',
      ),
    ).not.toBeInTheDocument()
  })

  it('holds the action inactive rather than reaching the service', async () => {
    const stub = vi.fn()
    vi.stubGlobal('fetch', stub)
    render(<Home />)
    const user = userEvent.setup()

    await user.click(screen.getByLabelText('Describe your system'))
    await user.tab()
    await user.click(screen.getByRole('button', { name: 'Find the articles' }))

    expect(stub).not.toHaveBeenCalled()
  })

  it('clears the message as soon as the description becomes valid', async () => {
    render(<Home />)
    const user = userEvent.setup()
    await user.click(screen.getByLabelText('Describe your system'))
    await user.tab()

    await user.type(screen.getByLabelText('Describe your system'), 'a chatbot')

    expect(
      screen.queryByText(
        'A description is needed before this can be answered.',
      ),
    ).not.toBeInTheDocument()
  })
})

describe('the loading state', () => {
  it('names the version being read and the measured range', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => new Promise(() => undefined)),
    )
    render(<Home />)

    await describeSystem()

    expect(
      screen.getByText(
        'Reading the amended text. Usually around 20 to 30 seconds.',
      ),
    ).toBeInTheDocument()
  })
})

describe('the answered state', () => {
  it('renders the claim in the interface voice', async () => {
    respondWith(200, anAnswer())
    render(<Home />)

    await describeSystem()

    expect(
      await screen.findByText(/has to tell the person they are interacting/),
    ).toBeInTheDocument()
  })

  it('renders the citation directly under the claim it supports', async () => {
    respondWith(200, anAnswer())
    render(<Home />)

    await describeSystem()

    expect(await screen.findByText('Article 50(1)')).toBeInTheDocument()
    expect(screen.getByText(/Providers shall ensure/)).toBeInTheDocument()
  })

  it('marks which text each citation was read from', async () => {
    respondWith(200, anAnswer())
    render(<Home />)

    await describeSystem()

    expect(await screen.findByText('amended')).toBeInTheDocument()
  })

  it('marks a provision the amendment moved and names our note as ours', async () => {
    respondWith(
      200,
      anAnswer({
        claims: [
          {
            statement: 'Creditworthiness evaluation is high-risk.',
            citations: [
              {
                ...citation,
                provision_id: 'anx_III.5.b',
                citation: 'Annex III(5)(b)',
                changed: true,
                change_note:
                  'Regulation (EU) 2026/1744 moved the date this bites.',
              },
            ],
          },
        ],
      }),
    )
    render(<Home />)

    await describeSystem()

    expect(
      await screen.findByText('moved by the amendment'),
    ).toBeInTheDocument()
    expect(screen.getByText(/Not the Act's words:/)).toBeInTheDocument()
  })

  it('says so when the answer stopped for want of room', async () => {
    respondWith(
      200,
      anAnswer({
        retrieval: { ...trace, truncated: true, dropped_ids: ['art_19'] },
      }),
    )
    render(<Home />)

    await describeSystem()

    expect(
      await screen.findByText(
        /stopped for want of room, not because it finished/,
      ),
    ).toBeInTheDocument()
  })
})

describe('the refused state', () => {
  it('renders as a result rather than in the failure region', async () => {
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
    render(<Home />)

    await describeSystem()

    expect(
      await screen.findByText('The text does not settle this'),
    ).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('shows what was read before saying so', async () => {
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
    render(<Home />)

    await describeSystem()

    expect(
      await screen.findByText('What was read before saying so'),
    ).toBeInTheDocument()
    expect(screen.getByText('Article 50(1)')).toBeInTheDocument()
  })
})

describe('the failure region', () => {
  it('names starting the model on unavailable, with the correlation id', async () => {
    respondWith(503, {
      state: 'unavailable',
      detail: 'ignored by the surface',
      correlationId: '8f2a-41d7',
    })
    render(<Home />)

    await describeSystem()

    expect(
      await screen.findByText('The model or the index is not running.'),
    ).toBeInTheDocument()
    expect(screen.getByText('correlation 8f2a-41d7')).toBeInTheDocument()
  })

  it('says waiting longer would not have helped on timeout', async () => {
    respondWith(504, {
      state: 'timeout',
      detail: 'ignored by the surface',
      correlationId: '8f2a-41d7',
    })
    render(<Home />)

    await describeSystem()

    expect(
      await screen.findByText('The model did not answer inside the budget.'),
    ).toBeInTheDocument()
  })

  it('names the correlation id as the next action on failed', async () => {
    respondWith(500, {
      state: 'failed',
      detail: 'ignored by the surface',
      correlationId: '8f2a-41d7',
    })
    render(<Home />)

    await describeSystem()

    expect(
      await screen.findByText(
        'Quote the correlation id and the log will answer.',
      ),
    ).toBeInTheDocument()
  })

  it('names starting the service on unreachable, and shows no correlation id', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(new TypeError('Failed to fetch'))),
    )
    render(<Home />)

    await describeSystem()

    expect(
      await screen.findByText('Nothing is listening on the service port.'),
    ).toBeInTheDocument()
    expect(screen.queryByText(/^correlation /)).not.toBeInTheDocument()
  })
})

describe('the trace', () => {
  it('reports cost on screen rather than behind the disclosure', async () => {
    respondWith(200, anAnswer())
    render(<Home />)

    await describeSystem()

    expect(await screen.findByText(/18 420 prompt/)).toBeInTheDocument()
    expect(screen.getByText(/12 searched|2 searched/)).toBeInTheDocument()
  })

  it('expands the three id lists in place', async () => {
    respondWith(200, anAnswer())
    render(<Home />)
    const user = await describeSystem()

    await user.click(await screen.findByRole('button', { expanded: false }))

    expect(screen.getByText('searched')).toBeInTheDocument()
    expect(screen.getByText('dropped')).toBeInTheDocument()
  })
})

describe('the theme control', () => {
  it('starts on match system, so the OS decides until a reader chooses', () => {
    render(<Home />)

    expect(
      screen.getByRole('button', { name: 'Match system' }),
    ).toHaveAttribute('aria-pressed', 'true')
  })

  it('writes the choice onto the document so the tokens switch', async () => {
    render(<Home />)
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: 'Dark' }))

    expect(document.documentElement.dataset.theme).toBe('dark')
  })

  it('clears the attribute on match system, handing the decision back to the OS', async () => {
    render(<Home />)
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Dark' }))

    await user.click(screen.getByRole('button', { name: 'Match system' }))

    expect(document.documentElement.dataset.theme).toBeUndefined()
  })

  it('remembers the choice for the next visit', async () => {
    render(<Home />)
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: 'Light' }))

    expect(localStorage.getItem('annex-theme')).toBe('light')
  })

  it('still applies the choice when the store refuses to keep it', async () => {
    const setItem = vi
      .spyOn(Storage.prototype, 'setItem')
      .mockImplementation(() => {
        throw new Error('blocked')
      })
    render(<Home />)
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: 'Dark' }))

    expect(document.documentElement.dataset.theme).toBe('dark')
    setItem.mockRestore()
  })
})

describe('the docked pane at 1024 pixels and wider', () => {
  function stubWideViewport() {
    vi.stubGlobal(
      'matchMedia',
      vi.fn((query: string) => ({
        matches: query === '(min-width: 1024px)',
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    )
  }

  beforeEach(() => {
    Element.prototype.scrollIntoView = vi.fn()
    stubWideViewport()
  })

  it('holds the terms and the reserved comparison before anything is asked', () => {
    render(<Home />)

    const pane = screen.getByRole('complementary', { name: 'Before you ask' })
    expect(pane).toHaveTextContent('Terms used on this page')
    expect(pane).toHaveTextContent('Reserved: the three-arm comparison')
  })

  it('shows the Act beside an answer rather than over it', async () => {
    respondWith(200, anAnswer())
    render(<Home />)

    await describeSystem()

    expect(
      await screen.findByRole('complementary', { name: 'The Act' }),
    ).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('moves the pane to a provision without opening an overlay', async () => {
    respondWith(200, anAnswer())
    render(<Home />)
    const user = await describeSystem()

    await user.click(
      await screen.findByRole('button', {
        name: /^Read all .* characters in the Act/,
      }),
    )

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(
      screen.getByRole('navigation', { name: 'Cited in this answer' }),
    ).toHaveTextContent('Article 50(1)')
  })

  it('keeps the trace a footer landmark beside the answer', async () => {
    respondWith(200, anAnswer())
    render(<Home />)

    await describeSystem()

    expect(await screen.findByRole('contentinfo')).toHaveTextContent(
      /18 420 prompt/,
    )
  })

  it('opens the walk in the pane from the trace', async () => {
    respondWith(200, anAnswer())
    render(<Home />)
    const user = await describeSystem()

    await user.click(await screen.findByRole('button', { name: /searched/ }))

    expect(screen.getByRole('button', { name: 'The walk' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })
})

describe('the controls', () => {
  it('re-asks against the other text when the version toggle changes', async () => {
    respondWith(200, anAnswer())
    render(<Home />)
    const user = await describeSystem()
    await screen.findByText(/has to tell the person/)

    await user.click(screen.getByRole('button', { name: 'Original' }))

    expect(lastSent().version).toBe('original')
  })

  it('returns to the empty state with the previous text still in the input', async () => {
    respondWith(200, anAnswer())
    render(<Home />)
    const user = await describeSystem()
    await screen.findByText(/has to tell the person/)

    await user.click(screen.getByRole('button', { name: 'Edit description' }))

    expect(screen.getByLabelText('Describe your system')).toHaveValue(
      'a customer chatbot',
    )
  })
})
