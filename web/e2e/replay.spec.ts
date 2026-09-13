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
  await expect(page.getByText('recorded', { exact: true })).toBeVisible()
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
