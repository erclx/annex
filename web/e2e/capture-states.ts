/**
 * Captures every state of the answer surface, in both themes, into `ui-states/`.
 *
 * A sibling of `screenshot.ts` rather than part of it. That one captures the
 * routes a deployment serves and checks the console is clean. This one drives
 * the surface into states a URL cannot reach, by stubbing the service at the
 * network layer, which is the only way to render a refusal or a cut-short
 * answer without a live model that happens to produce one.
 *
 * Run it against a production build, not a dev server, so the captures carry no
 * dev overlay:
 *
 *   bun run build
 *   bunx next start --port 4131 &
 *   CAPTURE_BASE_URL=http://localhost:4131 bun e2e/capture-states.ts
 *
 * `.claude/rules/project/ui/900-surface-evidence.md` says when to run this and
 * what to do with what it writes.
 */
import { chromium, type Page } from '@playwright/test'
import path from 'path'

const BASE = process.env.CAPTURE_BASE_URL ?? 'http://localhost:4131'
// Relative to the working directory, the way `screenshot.ts` resolves its own
// output. Run this from `web/`.
const OUT = 'ui-states'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Content-Type': 'application/json',
}

const DESCRIPTION =
  'A customer-service chatbot for a Swedish retail bank that also scores loan applications and passes a recommendation to a human underwriter.'

const cite = (over: Record<string, unknown> = {}) => ({
  provision_id: 'art_50.1',
  citation: 'Article 50(1)',
  kind: 'paragraph',
  version: 'consolidated',
  text: 'Providers shall ensure that AI systems intended to interact directly with natural persons are designed and developed in such a way that the natural persons concerned are informed.',
  changed: false,
  change_note: null,
  ...over,
})

const trace = {
  searched_ids: [
    'art_6',
    'art_6.2',
    'art_43',
    'art_50',
    'art_50.1',
    'anx_3.5.b',
    'art_25',
    'art_25.1',
    'art_16',
    'art_9',
  ],
  traversed_ids: [
    'art_6.1',
    'art_6.3',
    'art_8',
    'art_9',
    'art_10',
    'art_11',
    'art_12',
    'art_13',
    'art_14',
    'art_15',
    'art_16',
  ],
  dropped_ids: ['art_19', 'art_20', 'art_21', 'art_22', 'anx_4'],
  traversal_enabled: true,
  truncated: false,
  prompt_tokens: 18420,
  completion_tokens: 612,
  duration_ms: 21300,
  model: 'qwen3.8:27b',
}

const ANSWERED = {
  question: 'x',
  version: 'consolidated',
  claims: [
    {
      statement:
        'A system used to evaluate the creditworthiness of natural persons is high-risk, and the human underwriter at the end does not remove that classification.',
      citations: [
        cite({
          provision_id: 'anx_III.5.b',
          citation: 'Annex III(5)(b)',
          kind: 'annex',
          text: 'AI systems intended to be used to evaluate the creditworthiness of natural persons or establish their credit score.',
          changed: true,
          change_note:
            'Regulation (EU) 2026/1744 moved the date this bites. Read against the original text it was 2 August 2026.',
        }),
        cite({
          provision_id: 'art_6.2',
          citation: 'Article 6(2)',
          text: 'In addition to the high-risk AI systems referred to in paragraph 1, AI systems referred to in Annex III shall be considered to be high-risk.',
        }),
      ],
    },
    {
      statement:
        'The chatbot half has to tell the person they are interacting with an AI system.',
      citations: [cite()],
    },
  ],
  refusal: null,
  retrieval: trace,
}

const REFUSED = {
  question: 'x',
  version: 'consolidated',
  claims: [],
  refusal: {
    reason:
      'The Act makes substantial modification the trigger and never defines the threshold, so retraining on a quarterly cycle sits on neither side of it.',
    missing: [
      'what counts as a substantial modification',
      'whether retraining on new data of the same kind changes the intended purpose',
    ],
    consulted: [
      cite({ provision_id: 'art_25.1', citation: 'Article 25(1)' }),
      cite({ provision_id: 'art_6', citation: 'Article 6', kind: 'article' }),
    ],
  },
  retrieval: trace,
}

interface Case {
  name: string
  body?: unknown
  status?: number
  hang?: boolean
  skipAsk?: boolean
  blur?: boolean
  expand?: boolean
  reject?: boolean
}

const CASES: Case[] = [
  { name: '1-empty', skipAsk: true },
  { name: '2-invalid', skipAsk: true, blur: true },
  { name: '3-loading', hang: true },
  { name: '4-answered', body: ANSWERED, expand: true },
  {
    name: '5-answered-cut-short',
    body: { ...ANSWERED, retrieval: { ...trace, truncated: true } },
  },
  { name: '6-refused', body: REFUSED },
  {
    name: '7-failure-unavailable',
    body: { state: 'unavailable', detail: 'x', correlationId: '8f2a-41d7' },
    status: 503,
  },
  { name: '8-failure-unreachable', reject: true },
]

async function drive(page: Page, captureCase: Case) {
  await page.goto(BASE)
  if (captureCase.blur) {
    await page.getByLabel('Describe your system').click()
    await page.keyboard.press('Tab')
  }
  if (!captureCase.skipAsk) {
    await page.getByLabel('Describe your system').fill(DESCRIPTION)
    await page.getByRole('button', { name: 'Find the articles' }).click()
    await page.waitForTimeout(captureCase.hang ? 700 : 1200)
  }
  if (captureCase.expand) {
    await page.getByRole('contentinfo').getByRole('button').click()
    await page.waitForTimeout(300)
  }
}

const browser = await chromium.launch()

for (const theme of ['light', 'dark'] as const) {
  for (const captureCase of CASES) {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 900 },
      colorScheme: theme,
    })
    const page = await context.newPage()

    if (captureCase.reject) await page.route('**/ask', (route) => route.abort())
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

    await drive(page, captureCase)

    const file = path.join(OUT, `${captureCase.name}-${theme}.png`)
    await page.screenshot({ path: file, fullPage: true })
    console.log(`captured ui-states/${captureCase.name}-${theme}.png`)
    await context.close()
  }
}

await browser.close()
