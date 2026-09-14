import { expect, type Page, test } from '@playwright/test'

import { REPLAY_URL } from '../playwright.config'
import manifest from '../src/fixtures/manifest.json'
import { PLAYBACK_TIMEOUT } from './playback'
import { SERVICE_ASK } from './stream-stub'

/**
 * The deployed build, in a real browser, reaching no service.
 *
 * `src/lib/replay.test.ts` covers the matching and the parse inside the module
 * graph. What it cannot cover is the thing that matters most about this build,
 * which is that a visitor reaches an answer with nothing listening anywhere.
 * These run against a second server carrying the replay flag, and none of them
 * stubs a route, so a request leaving the page would fail the run rather than
 * pass it quietly.
 */

const RECORDED = manifest.entries[0].description
const UNRECORDED = 'a model that decides which crops to plant next season'

test('the page says it is a recording before anything is asked', async ({
  page,
}) => {
  await page.goto(REPLAY_URL)

  await expect(page.getByText('You are looking at a recording.')).toBeVisible()
  await expect(
    page.getByText('was captured from the live system, most recently on'),
  ).toBeVisible()
})

test('a recorded pick answers with nothing listening on the service port', async ({
  page,
}) => {
  // The failure this guards is the one the whole build exists to avoid: a
  // deployed page that looks right and reaches for a service nobody is running.
  // Matched on the service's own address, since the page's `/ask` route fetches
  // its payload from this build's origin under a path that also carries `/ask`.
  const requests: string[] = []
  page.on('request', (request) => {
    if (request.url().startsWith(SERVICE_ASK)) requests.push(request.url())
  })

  await page.goto(REPLAY_URL)
  await page.getByRole('button', { name: RECORDED }).click()

  await expect(page.getByText('THE SYSTEM YOU DESCRIBED')).toBeVisible()
  await expect(page.getByRole('contentinfo')).toBeVisible({
    timeout: PLAYBACK_TIMEOUT,
  })
  expect(requests).toEqual([])
})

test('a recorded pick plays its steps under a label saying the pace is illustrative', async ({
  page,
}) => {
  await page.goto(REPLAY_URL)
  await page.getByRole('button', { name: RECORDED }).click()

  await expect(page.getByText(/^Illustrative pace\./)).toBeVisible()
  await expect(
    page.getByRole('region', { name: 'The agent working' }),
  ).toBeVisible()
  await expect(page.getByRole('contentinfo')).toBeVisible({
    timeout: PLAYBACK_TIMEOUT,
  })
})

test.describe('the illustrative pace at 400 pixels', () => {
  test.use({ viewport: { width: 400, height: 860 } })

  test('the label stays on screen beside the steps', async ({ page }) => {
    await page.goto(REPLAY_URL)
    await page.getByRole('button', { name: RECORDED }).click()

    await expect(page.getByText(/^Illustrative pace\./)).toBeInViewport()
  })
})

test('every recorded question is offered as a pick', async ({ page }) => {
  // Both versions of a question carry one description, so the picks are the
  // distinct questions rather than the manifest's entries.
  const questions = new Set(manifest.entries.map((entry) => entry.question_id))

  await page.goto(REPLAY_URL)

  const picks = page.getByRole('button', {
    name: /^(a|we|our|software|when|from)/,
  })

  await expect(picks).toHaveCount(questions.size)
})

test('a description the recording does not hold says so rather than answering', async ({
  page,
}) => {
  await page.goto(REPLAY_URL)

  await page.getByLabel('Describe your system').fill(UNRECORDED)
  await page.getByRole('button', { name: 'Find the articles' }).click()

  await expect(
    page.getByText('This page holds a recording, and your description is not'),
  ).toBeVisible()
  await expect(
    page.getByText('run the system locally to ask your own'),
  ).toBeVisible()
})

test('the traversal switch is held inactive, since one recording cannot answer both', async ({
  page,
}) => {
  await page.goto(REPLAY_URL)

  await expect(page.getByRole('switch')).toBeDisabled()
  await expect(page.getByText('Recorded with traversal on')).toBeVisible()
})

test('the version toggle re-asks against the other text', async ({ page }) => {
  // Both versions were captured, so this control is live on the deployed build
  // where the traversal switch beside it is not.
  await page.goto(REPLAY_URL)
  await page.getByRole('button', { name: RECORDED }).click()
  await expect(page.getByRole('contentinfo')).toBeVisible({
    timeout: PLAYBACK_TIMEOUT,
  })

  // Scoped to the described-system card, the one place the version toggle
  // renders once an answer is on screen.
  const card = page.getByRole('region', { name: 'The system you described' })
  await card.getByRole('button', { name: 'Original' }).click()

  await expect(card.getByRole('button', { name: 'Original' })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await expect(page.getByRole('contentinfo')).toBeVisible()
})

test.describe('the top of the page at 400 pixels', () => {
  test.use({ viewport: { width: 400, height: 860 } })

  test('the question starts near the top of a phone screen', async ({
    page,
  }) => {
    await page.goto(REPLAY_URL)

    // `font-display: swap` paints a metrics-adjusted fallback first and swaps
    // to the embedded font once it loads, which is itself a layout shift.
    // Waiting for the swap here is what keeps this measurement about the
    // shipped font rather than about how fast the woff2 happened to arrive.
    await page.evaluate(() => document.fonts.ready)

    const heading = await page
      .getByRole('heading', { name: /Describe your AI system/ })
      .boundingBox()
    const input = await page.getByLabel('Describe your system').boundingBox()

    // Measured on the built export at 119 and 381 pixels. The input sits under
    // the full supporting paragraph, which carries the sentence saying the
    // page gives no compliance verdict, so it cannot be shortened to move it.
    expect(heading?.y ?? Infinity).toBeLessThanOrEqual(140)
    expect(input?.y ?? Infinity).toBeLessThanOrEqual(420)
  })

  test('the version and traversal choices sit in the composer', async ({
    page,
  }) => {
    await page.goto(REPLAY_URL)

    const composer = page.getByTestId('composer')
    await expect(
      composer.getByRole('group', { name: 'Which text to read against' }),
    ).toBeVisible()
    await expect(composer.getByText('Recorded with traversal on')).toBeVisible()
    await expect(page.getByRole('banner').getByRole('switch')).toHaveCount(0)
  })

  test('the recording band shortens to one line with its details a tap away', async ({
    page,
  }) => {
    await page.goto(REPLAY_URL)

    await expect(
      page.getByText('You are looking at a recording.'),
    ).toBeVisible()
    await expect(
      page.getByText('Nothing on this page calls a model.'),
    ).not.toBeVisible()
    await page.getByRole('button', { name: 'Details' }).click()
    await expect(
      page.getByText('Nothing on this page calls a model.'),
    ).toBeVisible()
    await expect(
      page.getByText(/was captured from the live system, most recently on/),
    ).toBeVisible()
  })
})

test.describe('an answer carried in the address', () => {
  const linked = manifest.entries[0]

  test('a recorded pick opens the ask route with its question and version in the address', async ({
    page,
  }) => {
    await page.goto(REPLAY_URL)
    await page.getByRole('button', { name: linked.description }).click()

    await expect(page).toHaveURL(
      new RegExp(`/ask\\?q=${linked.question_id}&v=consolidated`),
    )
  })

  test('a linked answer reopens as it was shared', async ({ page }) => {
    await page.goto(`${REPLAY_URL}/ask?q=${linked.question_id}&v=original`)

    await expectLinkedAnswer(page)
  })

  test('a link shared before the ask route lands on the same answer there', async ({
    page,
  }) => {
    await page.goto(`${REPLAY_URL}/?q=${linked.question_id}&v=original`)

    await expect(page).toHaveURL(
      new RegExp(`/ask\\?q=${linked.question_id}&v=original`),
    )
    await expectLinkedAnswer(page)
  })

  test('the back action returns an answer to the landing page', async ({
    page,
  }) => {
    await page.goto(REPLAY_URL)
    await page.getByRole('button', { name: linked.description }).click()
    await expect(page).toHaveURL(/\/ask\?/)

    await page.goBack()

    await expect(page).toHaveURL(`${REPLAY_URL}/`)
    await expect(
      page.getByRole('heading', { name: /Describe your AI system/ }),
    ).toBeVisible()
  })

  async function expectLinkedAnswer(page: Page) {
    await expect(page.getByRole('contentinfo')).toBeVisible({
      timeout: PLAYBACK_TIMEOUT,
    })
    await expect(page.getByText(linked.description).first()).toBeVisible()
    await expect(
      page
        .getByRole('region', { name: 'The system you described' })
        .getByRole('group', { name: 'Which text to read against' })
        .getByRole('button', { name: 'Original' }),
    ).toHaveAttribute('aria-pressed', 'true')
  }
})

test.describe('a refusal reading list', () => {
  const refused = manifest.entries.find(
    (entry) => entry.refused && entry.version === 'consolidated',
  )

  test('filters by an article number exactly', async ({ page }) => {
    test.skip(!refused, 'The recording holds no refusal on the amended text')
    await page.goto(REPLAY_URL)
    await page.getByRole('button', { name: refused?.description ?? '' }).click()

    await page
      .getByRole('button', { name: /provisions? read before refusing$/ })
      .click()
    const rows = page
      .getByRole('list', { name: 'Provisions read' })
      .getByRole('button')
    const firstArticle = (await rows.allTextContents())
      .map((row) => /^Article (\d+)/.exec(row)?.[1])
      .find((number) => number !== undefined)
    test.skip(!firstArticle, 'The refusal read no article')

    await page.getByRole('searchbox').fill(`Article ${firstArticle}`)

    for (const row of await rows.allTextContents()) {
      expect(row).toMatch(
        new RegExp(`^Article ${firstArticle}(\\(|search|walk|$)`),
      )
    }
    await page.keyboard.press('Escape')
    await expect(
      page.getByRole('list', { name: 'Provisions read' }),
    ).toHaveCount(0)
  })
})
