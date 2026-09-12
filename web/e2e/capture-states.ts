/**
 * Captures every state of the answer surface, in both themes, into `ui-evidence/`.
 *
 * A sibling of `screenshot.ts` rather than part of it. That one captures the
 * routes a deployment serves and checks the console is clean. This one drives
 * the surface into states a URL cannot reach, by stubbing the service at the
 * network layer, which is the only way to render a refusal or a cut-short
 * answer without a live model that happens to produce one.
 *
 * **The bodies it stubs are captured, not written.** They are read out of
 * `src/fixtures/`, which `uv run python -m annex capture` fills from the real
 * pipeline. An earlier version of this file carried hand-written statute text
 * that no model produced, and those literals are what the sixteen tracked
 * captures were built from. A surface evidence folder standing on invented
 * quotes is worse than none, because a reviewer trusts it.
 *
 * Two builds are needed, because the replay states cannot be reached from a
 * build that calls a service. Run the service-calling one first:
 *
 *   bun run build
 *   bunx next start --port 4131 &
 *   CAPTURE_BASE_URL=http://localhost:4131 bun e2e/capture-states.ts
 *
 * Then the deployed build, which is a static export and needs any file server:
 *
 *   NEXT_PUBLIC_ANNEX_MODE=replay bun run build
 *   (cd out && python3 -m http.server 4132) &
 *   CAPTURE_REPLAY_BASE_URL=http://localhost:4132 bun e2e/capture-states.ts
 *
 * Each run captures the cases its base URL can reach and says which it skipped,
 * so neither half is silently absent from the folder.
 *
 * `.claude/rules/project/ui/900-surface-evidence.md` says when to run this and
 * what to do with what it writes.
 */
import { chromium, expect, type Page } from '@playwright/test'
import path from 'path'

import answered from '../src/fixtures/q01-support-chatbot.consolidated.json'
import refused from '../src/fixtures/q08-redesigned-interface.consolidated.json'
import cutShort from '../src/fixtures/q09-wider-rollout.original.json'

const BASE = process.env.CAPTURE_BASE_URL
const REPLAY_BASE = process.env.CAPTURE_REPLAY_BASE_URL

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Content-Type': 'application/json',
}

// The description each stubbed case is typed with. It reaches no matcher, since
// the service is stubbed by route rather than by body, and it is what the
// captured surface shows under THE SYSTEM YOU DESCRIBED.
const DESCRIPTION = answered.question

// The one description the recording cannot hold, for the state that says so.
const UNRECORDED =
  'a model that decides which crops to plant on our farm next season'

interface Case {
  name: string
  body?: unknown
  status?: number
  hang?: boolean
  skipAsk?: boolean
  blur?: boolean
  expand?: boolean
  reject?: boolean
  describe?: string
  replay?: boolean
}

const CASES: Case[] = [
  { name: '1-empty', skipAsk: true },
  { name: '2-invalid', skipAsk: true, blur: true },
  { name: '3-loading', hang: true },
  { name: '4-answered', body: answered, expand: true },
  { name: '5-answered-cut-short', body: cutShort },
  { name: '6-refused', body: refused },
  {
    name: '7-failure-unavailable',
    body: { state: 'unavailable', detail: 'x', correlationId: '8f2a-41d7' },
    status: 503,
  },
  { name: '8-failure-unreachable', reject: true },
  { name: '9-replay-empty', skipAsk: true, replay: true },
  { name: '10-unrecorded', describe: UNRECORDED, replay: true },
]

async function drive(page: Page, captureCase: Case, base: string) {
  await page.goto(base)
  if (captureCase.blur) {
    await page.getByLabel('Describe your system').click()
    await page.keyboard.press('Tab')
  }
  if (!captureCase.skipAsk) {
    await page
      .getByLabel('Describe your system')
      .fill(captureCase.describe ?? DESCRIPTION)
    await page.getByRole('button', { name: 'Find the articles' }).click()
    await page.waitForTimeout(captureCase.hang ? 700 : 1200)
  }
  if (captureCase.expand) {
    await page.getByRole('contentinfo').getByRole('button').click()
    await page.waitForTimeout(300)
  }
}

/**
 * Asserts each case reached the state its name claims, so a case that stalls
 * on the form, hangs on the previous screen, or lands in the wrong failure
 * region throws here instead of being captured as-is.
 */
async function reached(page: Page, captureCase: Case) {
  const cutShortBanner = page.getByText(
    'The answer stopped for want of room, not because it finished.',
  )

  switch (captureCase.name) {
    case '1-empty':
      await expect(
        page.getByRole('heading', { name: /Describe what you are building/ }),
      ).toBeVisible()
      break
    case '2-invalid':
      await expect(
        page.getByText('A description is needed before this can be answered.'),
      ).toBeVisible()
      break
    case '3-loading':
      await expect(page.getByRole('status')).toBeVisible()
      break
    case '4-answered':
      await expect(page.locator('blockquote').first()).toBeVisible()
      await expect(cutShortBanner).toBeHidden()
      break
    case '5-answered-cut-short':
      await expect(cutShortBanner).toBeVisible()
      break
    case '6-refused':
      await expect(
        page.getByText('The text does not settle this'),
      ).toBeVisible()
      break
    case '7-failure-unavailable':
      await expect(
        page.getByText('The model or the index is not running.'),
      ).toBeVisible()
      break
    case '8-failure-unreachable':
      await expect(
        page.getByText('Nothing is listening on the service port.'),
      ).toBeVisible()
      break
    case '9-replay-empty':
      await expect(
        page.getByText(
          'This page replays a recording. Nothing here is asking a model.',
        ),
      ).toBeVisible()
      await expect(
        page.getByRole('heading', {
          name: 'Or read one of the recorded questions',
        }),
      ).toBeVisible()
      break
    case '10-unrecorded':
      await expect(
        page.getByText(
          'This page holds a recording, and your description is not in it.',
        ),
      ).toBeVisible()
      break
  }
}

const wanted = CASES.filter((item) =>
  item.replay ? REPLAY_BASE !== undefined : BASE !== undefined,
)

if (wanted.length === 0) {
  console.error(
    'Set CAPTURE_BASE_URL, CAPTURE_REPLAY_BASE_URL, or both. Neither is set, so there is nothing to drive.',
  )
  process.exit(1)
}

const skipped = CASES.filter((item) => !wanted.includes(item))
if (skipped.length > 0) {
  console.log(
    `skipping ${skipped.map((item) => item.name).join(', ')}: no base URL for them`,
  )
}

const browser = await chromium.launch()

for (const theme of ['light', 'dark'] as const) {
  for (const captureCase of wanted) {
    const base = captureCase.replay ? REPLAY_BASE : BASE
    // The filter above already dropped every case with no base URL. Narrowing
    // again is what lets `drive` take a string rather than an assertion.
    if (base === undefined) continue

    const context = await browser.newContext({
      viewport: { width: 1280, height: 900 },
      colorScheme: theme,
    })
    const page = await context.newPage()

    // A replay build fetches nothing, so a route stub on it would answer no
    // request and hide the fact that the page reads its own fixtures.
    if (!captureCase.replay) {
      if (captureCase.reject)
        await page.route('**/ask', (route) => route.abort())
      else if (captureCase.hang) await page.route('**/ask', () => undefined)
      else if (captureCase.body)
        await page.route('**/ask', async (route) => {
          if (route.request().method() === 'OPTIONS') {
            await route.fulfill({ status: 204, headers: CORS })
            return
          }
          await route.fulfill({
            status: captureCase.status ?? 200,
            headers: CORS,
            body: JSON.stringify(captureCase.body),
          })
        })
    }

    await drive(page, captureCase, base)
    await reached(page, captureCase)

    const file = path.join('ui-evidence', captureCase.name, `${theme}.png`)
    await page.screenshot({ path: file, fullPage: true })
    console.log(`captured ${file}`)
    await context.close()
  }
}

await browser.close()
