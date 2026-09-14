import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import Home from '@/app/page'
import { findProvision } from '@/lib/corpus'

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

    expect(screen.getByText(/Describe your AI system/)).toBeInTheDocument()
  })

  it('says it does not tell you whether you comply', () => {
    render(<Home />)

    expect(
      screen.getByText(/It won't tell you whether you comply/),
    ).toBeInTheDocument()
  })

  it('offers the recorded picks without replay mode on', () => {
    render(<Home />)

    expect(
      screen.getByText('Or start from a recorded question'),
    ).toBeInTheDocument()
  })

  it('gathers the load-bearing terms into a strip', () => {
    render(<Home />)

    expect(screen.getByText('Terms used on this page')).toBeInTheDocument()
    expect(screen.getByText('High risk')).toBeInTheDocument()
  })
})

describe('the invalid state', () => {
  const EMPTY = 'A description is needed before this can be answered.'
  const TOO_LONG =
    'The description is too long, so shorten it to 4 000 characters or fewer.'

  it('shows nothing when an empty description is only left', async () => {
    render(<Home />)
    const user = userEvent.setup()

    await user.click(screen.getByLabelText('Describe your system'))
    await user.tab()

    expect(screen.queryByText(EMPTY)).not.toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Find the articles' }),
    ).toBeEnabled()
  })

  it('renders on the input once an empty description is submitted', async () => {
    render(<Home />)
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: 'Find the articles' }))

    expect(screen.getByText(EMPTY)).toBeInTheDocument()
  })

  it('shows nothing on a field nobody has touched', () => {
    render(<Home />)

    expect(screen.queryByText(EMPTY)).not.toBeInTheDocument()
  })

  it('holds the action inactive rather than reaching the service', async () => {
    const stub = vi.fn()
    vi.stubGlobal('fetch', stub)
    render(<Home />)
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: 'Find the articles' }))
    await user.click(screen.getByRole('button', { name: 'Find the articles' }))

    expect(stub).not.toHaveBeenCalled()
  })

  it('clears the message as soon as the description becomes valid', async () => {
    render(<Home />)
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Find the articles' }))

    await user.type(screen.getByLabelText('Describe your system'), 'a chatbot')

    expect(screen.queryByText(EMPTY)).not.toBeInTheDocument()
  })

  it('says an over-length description is too long and names the limit', async () => {
    const stub = vi.fn()
    vi.stubGlobal('fetch', stub)
    render(<Home />)
    const user = userEvent.setup()
    await user.click(screen.getByLabelText('Describe your system'))
    await user.paste('x'.repeat(4001))

    await user.click(screen.getByRole('button', { name: 'Find the articles' }))

    expect(screen.getByText(TOO_LONG)).toBeInTheDocument()
    expect(screen.queryByText(EMPTY)).not.toBeInTheDocument()
    expect(stub).not.toHaveBeenCalled()
  })
})

/**
 * A stream route that sends the given frames and then holds the body open, the
 * way a live run sits in drafting for half a minute.
 */
function streamThenHold(frames: string[]) {
  vi.stubGlobal(
    'fetch',
    vi.fn(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        body: new ReadableStream({
          start(controller) {
            for (const frame of frames)
              controller.enqueue(new TextEncoder().encode(frame))
          },
        }),
        json: () => Promise.resolve(null),
      }),
    ),
  )
}

function nodeFrame(data: Record<string, unknown>): string {
  return `event: node\ndata: ${JSON.stringify(data)}\n\n`
}

describe('the loading state', () => {
  it('shows the steps the agent has taken and names the text it is searching', async () => {
    streamThenHold([nodeFrame({ node: 'route' })])
    render(<Home />)

    await describeSystem()

    const steps = await screen.findByRole('region', {
      name: 'The agent working',
    })
    expect(await within(steps).findByText('Query ready')).toBeInTheDocument()
    expect(
      within(steps).getByText('Searching the amended text by meaning'),
    ).toBeInTheDocument()
    expect(screen.queryByText(/20 to 30 seconds/)).not.toBeInTheDocument()
  })

  it('reports what search matched as its frame arrives', async () => {
    streamThenHold([
      nodeFrame({ node: 'route' }),
      nodeFrame({ node: 'retrieve', searched_ids: ['art_50', 'art_50.1'] }),
    ])
    render(<Home />)

    await describeSystem()

    expect(
      await screen.findByText(
        '2 provisions matched: Article 50, Article 50(1)',
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
                provision_id: 'art_95.4',
                citation: 'Article 95(4)',
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

  it('describes the cut generation rather than the provisions the budget dropped', async () => {
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
        'The model ran out of room while writing, so anything it would have said after the last claim here is missing.',
      ),
    ).toBeInTheDocument()
    expect(
      screen.queryByText(/cut before the model read them/),
    ).not.toBeInTheDocument()
  })

  it('raises no banner on an answer whose generation finished, however much the budget dropped', async () => {
    respondWith(
      200,
      anAnswer({
        retrieval: { ...trace, truncated: false, dropped_ids: ['art_19'] },
      }),
    )
    render(<Home />)

    await describeSystem()
    await screen.findByText(/has to tell the person they are interacting/)

    expect(
      screen.queryByText(/stopped for want of room/),
    ).not.toBeInTheDocument()
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
  beforeEach(() => {
    Element.prototype.scrollIntoView = vi.fn()
    stubWideViewport()
  })

  it('holds the terms and the three-arm comparison before anything is asked', () => {
    render(<Home />)

    const pane = screen.getByRole('complementary', { name: 'Before you ask' })
    expect(pane).toHaveTextContent('Terms used on this page')
    expect(pane).toHaveTextContent('The three-arm comparison')
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

  it('divides the answer from the Act with a handle at the default width', async () => {
    respondWith(200, anAnswer())
    render(<Home />)

    await describeSystem()

    expect(
      await screen.findByRole('separator', {
        name: 'Resize the answer and the Act',
      }),
    ).toHaveAttribute('aria-valuenow', '640')
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

  it('opens a provision in the Act from its chip in the walk', async () => {
    respondWith(
      200,
      anAnswer({
        retrieval: {
          ...trace,
          uncited_ids: [],
          edges: [{ source_id: 'art_50', target_id: 'art_50.2', hop: 1 }],
        },
      }),
    )
    render(<Home />)
    const user = await describeSystem()
    await user.click(await screen.findByRole('button', { name: /searched/ }))

    await user.click(screen.getByRole('button', { name: 'Article 50(2)' }))

    expect(screen.getByRole('button', { name: 'The Act' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })

  it('fills the pane with the walk while a question runs', async () => {
    streamThenHold([
      nodeFrame({ node: 'route' }),
      nodeFrame({ node: 'retrieve', searched_ids: ['art_50.1'] }),
    ])
    render(<Home />)

    await describeSystem()

    expect(
      await screen.findByRole('complementary', { name: 'The agent working' }),
    ).toBeInTheDocument()
  })

  it('lands Read all on the point the excerpt opened on', async () => {
    const annex = {
      ...citation,
      provision_id: 'anx_III',
      citation: 'Annex III',
      kind: 'annex',
      version: 'original',
      text: findProvision('original', 'anx_III')?.text ?? '',
    }
    respondWith(
      200,
      anAnswer({
        version: 'original',
        claims: [
          {
            statement:
              'The system falls within Annex III point 4(a), covering AI systems intended to be used for the recruitment or selection of natural persons, in particular to analyse and filter job applications and to evaluate candidates',
            citations: [annex],
          },
        ],
      }),
    )
    render(<Home />)
    const user = await describeSystem()

    await user.click(
      await screen.findByRole('button', {
        name: /^Read all .* characters in the Act/,
      }),
    )

    const pane = screen.getByRole('complementary', { name: 'The Act' })
    expect(
      within(pane)
        .getByText(/^\(a\) AI systems intended to be used for the recruitment/)
        .closest('[aria-current="location"]'),
    ).not.toBeNull()
  })

  it('holds what a refusal read behind one line, tagged by what reached it', async () => {
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
    const user = await describeSystem()

    await user.click(
      await screen.findByRole('button', {
        name: '1 provision read before refusing',
      }),
    )

    expect(
      within(screen.getByRole('list', { name: 'Provisions read' })).getByRole(
        'button',
      ),
    ).toHaveTextContent('Article 50(1)search')
    expect(
      screen.queryByRole('navigation', { name: 'Cited in this answer' }),
    ).not.toBeInTheDocument()
  })

  it('offers the commands that start what is missing beside an unavailable state', async () => {
    respondWith(503, {
      state: 'unavailable',
      detail: 'The model or the index is not running.',
      correlationId: '8f2a-41d7',
    })
    render(<Home />)

    await describeSystem()

    expect(
      await screen.findByRole('complementary', { name: 'Next step' }),
    ).toHaveTextContent('ollama serve')
  })

  it('offers the command that starts the service beside an unreachable state', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(new TypeError('Failed to fetch'))),
    )
    render(<Home />)

    await describeSystem()

    expect(
      await screen.findByRole('complementary', { name: 'Next step' }),
    ).toHaveTextContent('uv run python -m annex serve')
  })

  it('keeps the terms beside a timeout, which no command or pick would fix', async () => {
    respondWith(504, {
      state: 'timeout',
      detail: 'The model did not answer inside the budget.',
      correlationId: '8f2a-41d7',
    })
    render(<Home />)

    await describeSystem()

    expect(
      await screen.findByRole('complementary', { name: 'Before you ask' }),
    ).toBeInTheDocument()
  })
})

describe('the address', () => {
  beforeEach(() => {
    Element.prototype.scrollIntoView = vi.fn()
    stubWideViewport()
  })

  afterEach(() => {
    window.history.replaceState(null, '', '/')
  })

  it('carries the version and the provision the Act is showing once an answer shows', async () => {
    respondWith(200, anAnswer())
    render(<Home />)

    await describeSystem()
    await screen.findByText(/has to tell the person they are interacting/)

    const params = new URLSearchParams(window.location.search)
    expect(params.get('v')).toBe('consolidated')
    expect(params.get('p')).toBe('art_50.1')
  })

  it('never writes a description typed on the live build into the address', async () => {
    respondWith(200, anAnswer())
    render(<Home />)

    await describeSystem()
    await screen.findByText(/has to tell the person they are interacting/)

    expect(new URLSearchParams(window.location.search).has('q')).toBe(false)
    expect(window.location.search).not.toContain('chatbot')
  })

  it('leaves a shared address as it arrived until something is asked', () => {
    window.history.replaceState(null, '', '/?v=original&p=art_50.1')
    render(<Home />)

    expect(window.location.search).toBe('?v=original&p=art_50.1')
  })

  it('asks against the version the address names', async () => {
    window.history.replaceState(null, '', '/?v=original')
    respondWith(200, anAnswer())
    render(<Home />)

    await describeSystem()

    expect(lastSent().version).toBe('original')
  })

  it('asks against the amended text when the address names neither text', async () => {
    window.history.replaceState(null, '', '/?v=draft')
    respondWith(200, anAnswer())
    render(<Home />)

    await describeSystem()

    expect(lastSent().version).toBe('consolidated')
  })

  it('clears the answer from the address when the description is edited', async () => {
    respondWith(200, anAnswer())
    render(<Home />)
    const user = await describeSystem()
    await screen.findByText(/has to tell the person they are interacting/)

    await user.click(screen.getByRole('button', { name: 'Edit description' }))

    expect(new URLSearchParams(window.location.search).has('p')).toBe(false)
  })
})

describe('where the version and traversal choices sit', () => {
  it('places them in the composer before anything is asked', () => {
    render(<Home />)

    const composer = screen.getByTestId('composer')
    expect(
      within(composer).getByRole('group', {
        name: 'Which text to read against',
      }),
    ).toBeInTheDocument()
    expect(
      within(composer).getByRole('switch', { name: 'Reference traversal' }),
    ).toBeInTheDocument()
    expect(
      within(screen.getByRole('banner')).queryByRole('switch'),
    ).not.toBeInTheDocument()
  })

  it('keeps the links in the bar before anything is asked', () => {
    render(<Home />)

    expect(
      within(screen.getByRole('banner')).getByRole('link', {
        name: 'Repository',
      }),
    ).toBeInTheDocument()
  })

  it('places the version toggle in the card and nowhere else once asked', async () => {
    Element.prototype.scrollIntoView = vi.fn()
    stubWideViewport()
    respondWith(200, anAnswer())
    render(<Home />)

    await describeSystem()
    await screen.findByText(/has to tell the person/)

    expect(
      within(
        screen.getByRole('region', { name: 'The system you described' }),
      ).getByRole('group', { name: 'Which text to read against' }),
    ).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'Original' })).toHaveLength(1)
  })

  it('keeps the traversal switch in the bar once asked at 1024 and wider', async () => {
    Element.prototype.scrollIntoView = vi.fn()
    stubWideViewport()
    respondWith(200, anAnswer())
    render(<Home />)

    await describeSystem()
    await screen.findByText(/has to tell the person/)

    // The docked pane draws a header of its own, so the bar is found by
    // elimination: one switch on the page, and none of it inside the card.
    expect(screen.getAllByRole('switch')).toHaveLength(1)
    expect(
      within(
        screen.getByRole('region', { name: 'The system you described' }),
      ).queryByRole('switch'),
    ).not.toBeInTheDocument()
  })

  it('moves the traversal switch into the card once asked below 1024', async () => {
    respondWith(200, anAnswer())
    render(<Home />)

    await describeSystem()
    await screen.findByText(/has to tell the person/)

    expect(
      within(
        screen.getByRole('region', { name: 'The system you described' }),
      ).getByRole('switch', { name: 'Reference traversal' }),
    ).toBeInTheDocument()
    expect(screen.getAllByRole('switch')).toHaveLength(1)
  })

  it('mounts one version toggle when the service rejects a submit', async () => {
    respondWith(422, { state: 'invalid', detail: 'The description is empty.' })
    render(<Home />)

    await describeSystem()
    await screen.findByText(
      'A description is needed before this can be answered.',
    )

    expect(
      screen.getAllByRole('group', { name: 'Which text to read against' }),
    ).toHaveLength(1)
  })
})

describe('the controls', () => {
  it('re-asks against the other text when the version toggle changes', async () => {
    respondWith(200, anAnswer())
    render(<Home />)
    const user = await describeSystem()
    await screen.findByText(/has to tell the person/)

    await user.click(
      within(
        screen.getByRole('region', { name: 'The system you described' }),
      ).getByRole('button', { name: 'Original' }),
    )

    expect(lastSent().version).toBe('original')
  })

  it('returns to the empty state from the mark in the bar', async () => {
    respondWith(200, anAnswer())
    render(<Home />)
    const user = await describeSystem()
    await screen.findByText(/has to tell the person/)

    await user.click(screen.getByRole('link', { name: 'Annex' }))

    expect(screen.getByLabelText('Describe your system')).toBeInTheDocument()
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
