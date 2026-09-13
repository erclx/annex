import { expect, test } from '@playwright/test'

import { REPLAY_URL } from '../playwright.config'
import manifest from '../src/fixtures/manifest.json'

/**
 * The Act, driven from a real citation on a real answer, in both of its forms.
 *
 * Runs against the replay build for the reason `replay.spec.ts` gives: the
 * reader reads a static export of the corpus, so nothing here needs a service
 * or a model, and a request leaving the page would fail the run.
 *
 * The project's viewport is desktop width, where the Act docks beside the
 * answer. The overlay form exists only below 1024 pixels, so its cases pin a
 * narrow viewport rather than relying on the default.
 */

const RECORDED = manifest.entries[0].description

test.describe('docked beside the answer', () => {
  test('the Act sits beside the answer rather than over it', async ({
    page,
  }) => {
    await page.goto(REPLAY_URL)
    await page.getByRole('button', { name: RECORDED }).click()
    await expect(page.getByRole('contentinfo')).toBeVisible()

    await expect(
      page.getByRole('complementary', { name: 'The Act' }),
    ).toBeVisible()
    await expect(page.getByRole('dialog')).toHaveCount(0)
  })

  test('an excerpt handle moves the pane to its provision', async ({
    page,
  }) => {
    await page.goto(REPLAY_URL)
    await page.getByRole('button', { name: RECORDED }).click()

    const handle = page
      .getByRole('button', {
        name: /^(Read all .* characters|Open) in the Act/,
      })
      .last()
    await handle.click()

    await expect(page.getByRole('dialog')).toHaveCount(0)
    await expect(
      page
        .getByRole('navigation', { name: 'Cited in this answer' })
        .locator('[aria-current="true"]'),
    ).toHaveCount(1)
  })

  test('jumping to a paragraph keeps its article heading in view', async ({
    page,
  }) => {
    await page.goto(REPLAY_URL)
    await page.getByRole('button', { name: RECORDED }).click()

    const pane = page.getByRole('complementary', { name: 'The Act' })
    await pane
      .getByRole('navigation', { name: 'Cited in this answer' })
      .getByRole('button', { name: /\(\d+\)$/ })
      .first()
      .click()

    // The tint marks the paragraph, and the heading of the article carrying it
    // is what tells a reader which article they are reading.
    await expect(
      pane.locator('article:has(p.bg-accent-soft) > h2'),
    ).toBeInViewport()
  })

  test('the trace opens the walk in the pane', async ({ page }) => {
    await page.goto(REPLAY_URL)
    await page.getByRole('button', { name: RECORDED }).click()

    await page
      .getByRole('contentinfo')
      .getByRole('button', { name: /searched/ })
      .click()

    await expect(
      page.getByRole('complementary', { name: 'The Act' }).getByRole('button', {
        name: 'The walk',
      }),
    ).toHaveAttribute('aria-pressed', 'true')
  })
})

test.describe('as an overlay below 1024 pixels', () => {
  test.use({ viewport: { width: 400, height: 860 } })

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

  test('closing the panel returns to the answer underneath', async ({
    page,
  }) => {
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
})
