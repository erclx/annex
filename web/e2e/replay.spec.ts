import { expect, test } from '@playwright/test'

import { REPLAY_URL } from '../playwright.config'
import manifest from '../src/fixtures/manifest.json'

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

  await expect(
    page.getByText('This page replays a recording. Nothing here is asking a'),
  ).toBeVisible()
  await expect(
    page.getByText('came back from the live system on'),
  ).toBeVisible()
})

test('a recorded pick answers with nothing listening on the service port', async ({
  page,
}) => {
  // The failure this guards is the one the whole build exists to avoid: a
  // deployed page that looks right and reaches for a service nobody is running.
  const requests: string[] = []
  page.on('request', (request) => {
    if (request.url().includes('/ask')) requests.push(request.url())
  })

  await page.goto(REPLAY_URL)
  await page.getByRole('button', { name: RECORDED }).click()

  await expect(page.getByText('THE SYSTEM YOU DESCRIBED')).toBeVisible()
  await expect(page.getByRole('contentinfo')).toBeVisible()
  expect(requests).toEqual([])
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
  await expect(page.getByRole('contentinfo')).toBeVisible()

  // Scoped to the top bar, since the docked Act carries its own version toggle,
  // which reads the other text without re-asking.
  const topBar = page.getByRole('banner')
  await topBar.getByRole('button', { name: 'Original' }).click()

  await expect(
    topBar.getByRole('button', { name: 'Original' }),
  ).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByRole('contentinfo')).toBeVisible()
})

test.describe('the top of the page at 400 pixels', () => {
  test.use({ viewport: { width: 400, height: 860 } })

  test('the question starts near the top of a phone screen', async ({
    page,
  }) => {
    await page.goto(REPLAY_URL)

    const heading = await page
      .getByRole('heading', { name: /Describe what you are building/ })
      .boundingBox()
    const input = await page.getByLabel('Describe your system').boundingBox()

    // Measured on the built export at 119 and 391 pixels. The input sits under
    // the full supporting paragraph, which carries the sentence saying the
    // page gives no compliance verdict, so it cannot be shortened to move it.
    expect(heading?.y ?? Infinity).toBeLessThanOrEqual(140)
    expect(input?.y ?? Infinity).toBeLessThanOrEqual(420)
  })

  test('the version and traversal choices sit under the description', async ({
    page,
  }) => {
    await page.goto(REPLAY_URL)

    await expect(
      page
        .getByRole('banner')
        .getByRole('group', { name: 'Which text to read against' }),
    ).toHaveCount(0)
    await expect(
      page.getByRole('group', { name: 'Which text to read against' }),
    ).toBeVisible()
  })

  test('the recording band shortens to one line with its details a tap away', async ({
    page,
  }) => {
    await page.goto(REPLAY_URL)

    await expect(page.getByText('A recording, not a live model.')).toBeVisible()
    await page.getByRole('button', { name: 'Details' }).click()
    await expect(
      page.getByText(/came back from the live system on/),
    ).toBeVisible()
  })
})

test.describe('an answer carried in the address', () => {
  const linked = manifest.entries[0]

  test('a recorded pick writes its question and version into the address', async ({
    page,
  }) => {
    await page.goto(REPLAY_URL)
    await page.getByRole('button', { name: linked.description }).click()

    await expect(page).toHaveURL(new RegExp(`q=${linked.question_id}`))
    await expect(page).toHaveURL(/v=consolidated/)
  })

  test('a linked answer reopens as it was shared', async ({ page }) => {
    await page.goto(`${REPLAY_URL}?q=${linked.question_id}&v=original`)

    await expect(page.getByRole('contentinfo')).toBeVisible()
    await expect(page.getByText(linked.description).first()).toBeVisible()
    await expect(
      page
        .getByRole('group', { name: 'Which text to read against' })
        .getByRole('button', { name: 'Original' }),
    ).toHaveAttribute('aria-pressed', 'true')
  })
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
