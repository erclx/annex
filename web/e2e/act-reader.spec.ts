import { expect, test } from '@playwright/test'

import { REPLAY_URL } from '../playwright.config'
import manifest from '../src/fixtures/manifest.json'

/**
 * The reading panel, driven from a real citation on a real answer.
 *
 * Runs against the replay build for the reason `replay.spec.ts` gives: the
 * panel reads a static export of the corpus, so nothing here needs a service
 * or a model, and a request leaving the page would fail the run.
 */

const RECORDED = manifest.entries[0].description

test('activating a citation opens the Act to that provision', async ({
  page,
}) => {
  await page.goto(REPLAY_URL)
  await page.getByRole('button', { name: RECORDED }).click()
  await expect(page.getByRole('contentinfo')).toBeVisible()

  const citation = page.getByRole('button', { name: /^Article \d/ }).first()
  const citationName = await citation.textContent()
  await citation.click()

  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await expect(dialog).toHaveAccessibleName(citationName ?? '')
})

test('closing the panel returns to the answer underneath', async ({ page }) => {
  await page.goto(REPLAY_URL)
  await page.getByRole('button', { name: RECORDED }).click()
  await page
    .getByRole('button', { name: /^Article \d/ })
    .first()
    .click()
  await expect(page.getByRole('dialog')).toBeVisible()

  await page.getByRole('button', { name: 'Close', exact: true }).click()

  await expect(page.getByRole('dialog')).not.toBeVisible()
  await expect(page.getByRole('contentinfo')).toBeVisible()
})

test('the panel version toggle reads the other text without re-asking', async ({
  page,
}) => {
  const requests: string[] = []
  page.on('request', (request) => {
    if (request.url().includes('/ask')) requests.push(request.url())
  })

  await page.goto(REPLAY_URL)
  await page.getByRole('button', { name: RECORDED }).click()
  await page
    .getByRole('button', { name: /^Article \d/ })
    .first()
    .click()
  await expect(page.getByRole('dialog')).toBeVisible()

  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Original' })
    .click()

  await expect(
    page.getByRole('dialog').getByRole('button', { name: 'Original' }),
  ).toHaveAttribute('aria-pressed', 'true')
  expect(requests).toEqual([])
})
