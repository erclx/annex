import { expect, test } from '@playwright/test'

import { REPLAY_URL } from '../playwright.config'
import manifest from '../src/fixtures/manifest.json'
import { PLAYBACK_TIMEOUT } from './playback'

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
    await expect(page.getByRole('contentinfo')).toBeVisible({
      timeout: PLAYBACK_TIMEOUT,
    })

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

  test('jumping to a paragraph lands it flush under the section bar', async ({
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

    // The operator's first-use pass asked for the provision a jump lands on to
    // sit at the top of the text rather than below its article's heading. The
    // section bar names the article, so the heading's context is not lost.
    await expect
      .poll(async () => {
        const text = await pane
          .getByRole('region', { name: 'Text of the Act' })
          .boundingBox()
        const tinted = await pane
          .locator('[aria-current="location"]')
          .boundingBox()
        return text && tinted ? Math.abs(tinted.y - text.y) : Infinity
      })
      .toBeLessThanOrEqual(24)
  })

  test('the section bar steps to the next article in the whole Act', async ({
    page,
  }) => {
    await page.goto(REPLAY_URL)
    await page.getByRole('button', { name: RECORDED }).click()

    const pane = page.getByRole('complementary', { name: 'The Act' })
    const count = pane.getByText(/^\d+ of \d+$/)
    const before = Number((await count.textContent())?.split(' ')[0])

    await pane.getByRole('button', { name: 'Next section' }).click()

    await expect(count).toHaveText(`${before + 1} of 133`)
  })

  test('the section bar steps through cited provisions once switched', async ({
    page,
  }) => {
    await page.goto(REPLAY_URL)
    await page.getByRole('button', { name: RECORDED }).click()

    const pane = page.getByRole('complementary', { name: 'The Act' })
    await pane.getByRole('button', { name: 'Cited', exact: true }).click()
    await pane.getByRole('button', { name: 'Next cited provision' }).click()

    await expect(pane.getByText(/^2 of \d+ cited$/)).toBeVisible()
  })

  test('the jump field opens an annex by its numeral', async ({ page }) => {
    await page.goto(REPLAY_URL)
    await page.getByRole('button', { name: RECORDED }).click()

    const pane = page.getByRole('complementary', { name: 'The Act' })
    await pane
      .getByRole('textbox', { name: 'Go to an article or annex' })
      .fill('iii')
    await pane
      .getByRole('textbox', { name: 'Go to an article or annex' })
      .press('Enter')

    await expect(pane.locator('article.bg-accent-soft > h2')).toContainText(
      'Annex III',
    )
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
    await expect(page.getByRole('contentinfo')).toBeVisible({
      timeout: PLAYBACK_TIMEOUT,
    })

    const citation = page.getByRole('button', { name: /^Article \d/ }).first()
    const citationName = await citation.textContent()
    await citation.click()

    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    await expect(dialog).toHaveAccessibleName(citationName ?? '')
  })

  test('opening a paragraph keeps its article named at the top of the overlay', async ({
    page,
  }) => {
    await page.goto(REPLAY_URL)
    await page.getByRole('button', { name: RECORDED }).click()

    const citation = page
      .getByRole('button', { name: /^Article \d+\(\d+\)$/ })
      .first()
    const citationText = await citation.textContent()
    await citation.click()

    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()

    // The overlay carries no section bar, so a paragraph landing without its
    // article names nothing. Whether the landing scrolls the heading itself
    // into view depends on whether the paragraph and its heading fit the
    // overlay together, per `canon/wireframes/answer.md` § Reading the Act,
    // so this label is what keeps the article named regardless. It is the
    // one element between the header and the scrolling body, rather than a
    // role or an accessible name, since it carries neither.
    const articleNumber = citationText?.match(/^Article (\d+)/)?.[1]
    const articleLabel = dialog.locator('header + div')
    await expect(articleLabel).toHaveText(`Article ${articleNumber}`)
    await expect(articleLabel).toBeInViewport()
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

  test('the panel link reads the other text without re-asking', async ({
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

    const dialog = page.getByRole('dialog')
    await dialog.getByRole('button', { name: 'Read the original text' }).click()

    await expect(dialog.getByText('Reading the original text')).toBeVisible()
    await expect(
      dialog.getByRole('button', { name: 'Read the amended text' }),
    ).toBeVisible()
    expect(requests).toEqual([])
  })
})

test.describe('a changed citation', () => {
  const promotion = manifest.entries.find(
    (entry) =>
      entry.question_id === 'q06-worker-promotion' &&
      entry.version === 'original',
  )

  test('following a changed citation lands on the highlighted provision', async ({
    page,
  }) => {
    await page.goto(REPLAY_URL)
    await page
      .getByRole('button', { name: promotion?.description ?? '' })
      .click()

    // The recorded pick opens against the amended text by default, and the
    // changed citation this run reads sits in the original text's answer.
    await page
      .getByRole('region', { name: 'The system you described' })
      .getByRole('button', { name: 'Original' })
      .click()

    const figure = page.locator('figure', {
      has: page.getByText('moved by the amendment'),
    })
    await figure.getByRole('button', { name: 'Article 10' }).click()

    const pane = page.getByRole('complementary', { name: 'The Act' })
    await expect(pane.locator('mark').first()).toBeVisible()
  })
})

test.describe('an excerpt landing on its closest point', () => {
  const screening = manifest.entries.find(
    (entry) => entry.question_id === 'q04-cv-screening',
  )

  test('Read all lands flush on the point the excerpt names', async ({
    page,
  }) => {
    await page.goto(REPLAY_URL)
    await page
      .getByRole('button', { name: screening?.description ?? '' })
      .click()

    const figure = page.locator('figure', {
      has: page.getByRole('button', {
        name: 'Annex III, point 4(a)',
        exact: true,
      }),
    })
    await expect(figure.getByText('closest point')).toBeVisible({
      timeout: PLAYBACK_TIMEOUT,
    })
    await figure.getByRole('button', { name: /^Read all/ }).click()

    const pane = page.getByRole('complementary', { name: 'The Act' })
    const landed = pane.locator('[aria-current="location"]')
    await expect(landed).toContainText(
      'recruitment or selection of natural persons',
    )
    await expect
      .poll(async () => {
        const text = await pane
          .getByRole('region', { name: 'Text of the Act' })
          .boundingBox()
        const box = await landed.boundingBox()
        return text && box ? Math.abs(box.y - text.y) : Infinity
      })
      .toBeLessThanOrEqual(24)
  })
})
