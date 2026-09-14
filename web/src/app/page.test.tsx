import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import Home from '@/app/page'
import { AskHandoffProvider } from '@/components/ask-handoff'
import { recordedQuestions } from '@/lib/replay'

const navigation = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn() }))
const build = vi.hoisted(() => ({ replay: false }))

vi.mock('next/navigation', () => ({ useRouter: () => navigation }))

// The replay flag is read at module scope, so a case about the deployed build
// flips it through a getter rather than through the environment.
vi.mock('@/lib/replay', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/replay')>()
  return {
    ...actual,
    get REPLAY_MODE() {
      return build.replay
    },
  }
})

function renderHome() {
  return render(
    <AskHandoffProvider>
      <Home />
    </AskHandoffProvider>,
  )
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

afterEach(() => {
  vi.unstubAllGlobals()
  navigation.push.mockReset()
  navigation.replace.mockReset()
  build.replay = false
  window.history.replaceState(null, '', '/')
  // The theme control writes to the document and the store, both of which
  // outlive a render, so a test that changed either would leak into the next.
  delete document.documentElement.dataset.theme
  localStorage.clear()
})

describe('the empty state', () => {
  it('states what the tool does before anything is asked', () => {
    renderHome()

    expect(screen.getByText(/Describe your AI system/)).toBeInTheDocument()
  })

  it('says it does not tell you whether you comply', () => {
    renderHome()

    expect(
      screen.getByText(/It won't tell you whether you comply/),
    ).toBeInTheDocument()
  })

  it('offers the recorded picks without replay mode on', () => {
    renderHome()

    expect(
      screen.getByText('Or start from a recorded question'),
    ).toBeInTheDocument()
  })

  it('gathers the load-bearing terms into a strip', () => {
    renderHome()

    expect(screen.getByText('Terms used on this page')).toBeInTheDocument()
    expect(screen.getByText('High risk')).toBeInTheDocument()
  })

  it('sets the terms and the comparison as page sections rather than a pane at 1024 and wider', () => {
    stubWideViewport()
    renderHome()

    expect(
      screen.getByRole('heading', { name: 'The three-arm comparison' }),
    ).toBeInTheDocument()
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument()
  })
})

describe('the invalid state', () => {
  const EMPTY = 'A description is needed before this can be answered.'
  const TOO_LONG =
    'The description is too long, so shorten it to 4 000 characters or fewer.'

  it('shows nothing when an empty description is only left', async () => {
    renderHome()
    const user = userEvent.setup()

    await user.click(screen.getByLabelText('Describe your system'))
    await user.tab()

    expect(screen.queryByText(EMPTY)).not.toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Find the articles' }),
    ).toBeEnabled()
  })

  it('renders on the input once an empty description is submitted', async () => {
    renderHome()
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: 'Find the articles' }))

    expect(screen.getByText(EMPTY)).toBeInTheDocument()
  })

  it('shows nothing on a field nobody has touched', () => {
    renderHome()

    expect(screen.queryByText(EMPTY)).not.toBeInTheDocument()
  })

  it('holds the action inactive rather than leaving the page', async () => {
    renderHome()
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: 'Find the articles' }))
    await user.click(screen.getByRole('button', { name: 'Find the articles' }))

    expect(navigation.push).not.toHaveBeenCalled()
  })

  it('clears the message as soon as the description becomes valid', async () => {
    renderHome()
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Find the articles' }))

    await user.type(screen.getByLabelText('Describe your system'), 'a chatbot')

    expect(screen.queryByText(EMPTY)).not.toBeInTheDocument()
  })

  it('says an over-length description is too long and names the limit', async () => {
    renderHome()
    const user = userEvent.setup()
    await user.click(screen.getByLabelText('Describe your system'))
    await user.paste('x'.repeat(4001))

    await user.click(screen.getByRole('button', { name: 'Find the articles' }))

    expect(screen.getByText(TOO_LONG)).toBeInTheDocument()
    expect(screen.queryByText(EMPTY)).not.toBeInTheDocument()
    expect(navigation.push).not.toHaveBeenCalled()
  })
})

describe('the way to the ask route', () => {
  it('opens the ask route on a valid submit, against the text chosen', async () => {
    renderHome()
    const user = userEvent.setup()
    await user.type(
      screen.getByLabelText('Describe your system'),
      'a customer chatbot',
    )
    await user.click(screen.getByRole('button', { name: 'Original' }))

    await user.click(screen.getByRole('button', { name: 'Find the articles' }))

    expect(navigation.push).toHaveBeenCalledWith('/ask?v=original')
  })

  it('never writes a typed description into the ask address', async () => {
    renderHome()
    const user = userEvent.setup()
    await user.type(
      screen.getByLabelText('Describe your system'),
      'a customer chatbot',
    )

    await user.click(screen.getByRole('button', { name: 'Find the articles' }))

    expect(navigation.push).toHaveBeenCalledWith('/ask?v=consolidated')
  })

  it('opens the ask route on a recorded pick', async () => {
    renderHome()
    const user = userEvent.setup()

    await user.click(
      screen.getByRole('button', { name: recordedQuestions[0].description }),
    )

    expect(navigation.push).toHaveBeenCalledWith('/ask?v=consolidated')
  })

  it('names the recorded question in the ask address on the replay build', async () => {
    build.replay = true
    renderHome()
    const user = userEvent.setup()

    await user.click(
      screen.getByRole('button', { name: recordedQuestions[0].description }),
    )

    expect(navigation.push).toHaveBeenCalledWith(
      `/ask?q=${recordedQuestions[0].id}&v=consolidated`,
    )
  })
})

describe('an address shared before the ask route existed', () => {
  it('forwards a recorded answer to the ask route on the replay build', () => {
    build.replay = true
    const id = recordedQuestions[0].id
    window.history.replaceState(null, '', `/?q=${id}&v=original&p=art_50.1`)

    renderHome()

    expect(navigation.replace).toHaveBeenCalledWith(
      `/ask?q=${id}&v=original&p=art_50.1`,
    )
  })

  it('stays on the landing page for an address carrying a version alone', () => {
    build.replay = true
    window.history.replaceState(null, '', '/?v=original')

    renderHome()

    expect(navigation.replace).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Original' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })

  it('forwards nothing on the live build, which never wrote a question', () => {
    window.history.replaceState(
      null,
      '',
      `/?q=${recordedQuestions[0].id}&v=original`,
    )

    renderHome()

    expect(navigation.replace).not.toHaveBeenCalled()
  })
})

describe('the theme control', () => {
  it('starts on match system, so the OS decides until a reader chooses', () => {
    renderHome()

    expect(
      screen.getByRole('button', { name: 'Match system' }),
    ).toHaveAttribute('aria-pressed', 'true')
  })

  it('writes the choice onto the document so the tokens switch', async () => {
    renderHome()
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: 'Dark' }))

    expect(document.documentElement.dataset.theme).toBe('dark')
  })

  it('clears the attribute on match system, handing the decision back to the OS', async () => {
    renderHome()
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Dark' }))

    await user.click(screen.getByRole('button', { name: 'Match system' }))

    expect(document.documentElement.dataset.theme).toBeUndefined()
  })

  it('remembers the choice for the next visit', async () => {
    renderHome()
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
    renderHome()
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: 'Dark' }))

    expect(document.documentElement.dataset.theme).toBe('dark')
    setItem.mockRestore()
  })
})

describe('where the version and traversal choices sit', () => {
  it('places them in the composer', () => {
    renderHome()

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

  it('keeps the traversal hint as visible text in the composer', () => {
    renderHome()

    expect(
      within(screen.getByTestId('composer')).getByText(
        'Turn off to compare against search alone',
      ),
    ).toBeVisible()
  })

  it('keeps the links in the bar', () => {
    renderHome()

    expect(
      within(screen.getByRole('banner')).getByRole('link', {
        name: 'Repository',
      }),
    ).toBeInTheDocument()
  })
})
