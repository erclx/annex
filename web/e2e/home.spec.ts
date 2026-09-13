import { expect, type Page, test } from '@playwright/test'

/**
 * The surface against a real browser and a real fetch.
 *
 * The component tests in `src/app/page.test.tsx` stub `fetch` inside the module
 * graph, which never exercises the request the browser actually makes. These
 * exercise that: one path where the service answers, and one where nothing is
 * listening on the service port, which is the only failure state reachable
 * without stubbing anything at all.
 */

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
}

const ANSWER = {
  question: 'a customer chatbot',
  version: 'consolidated',
  claims: [
    {
      statement:
        'The chatbot has to tell the person they are interacting with an AI system.',
      citations: [
        {
          provision_id: 'art_50.1',
          citation: 'Article 50(1)',
          kind: 'paragraph',
          version: 'consolidated',
          text: 'Providers shall ensure that AI systems intended to interact directly with natural persons are informed.',
          changed: false,
          change_note: null,
        },
      ],
    },
  ],
  refusal: null,
  retrieval: {
    searched_ids: ['art_50', 'art_50.1'],
    traversed_ids: ['art_50.2'],
    dropped_ids: [],
    edges: [{ source_id: 'art_50', target_id: 'art_50.2', hop: 1 }],
    traversal_enabled: true,
    truncated: false,
    prompt_tokens: 18420,
    completion_tokens: 612,
    duration_ms: 21300,
    model: 'annex-qwen3-27b',
  },
}

async function serviceAnswers(page: Page, body: unknown, status = 200) {
  await page.route('**/ask', async (route) => {
    if (route.request().method() === 'OPTIONS') {
      await route.fulfill({ status: 204, headers: CORS })
      return
    }
    await route.fulfill({
      status,
      headers: { ...CORS, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  })
}

/** An answer long enough that the page scrolls at a 1280 by 860 window. */
const LONG_ANSWER = {
  ...ANSWER,
  claims: Array.from({ length: 10 }, () => ANSWER.claims[0]),
}

async function describeSystem(page: Page, text = 'a customer chatbot') {
  await page.getByLabel('Describe your system').fill(text)
  await page.getByRole('button', { name: 'Find the articles' }).click()
}

test('home page loads', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveTitle(/.+/)
})

test('the empty state asks for a description and disclaims a verdict', async ({
  page,
}) => {
  await page.goto('/')

  await expect(
    page.getByText('Describe what you are building. You get back'),
  ).toBeVisible()
  await expect(
    page.getByText('It does not tell you whether you comply'),
  ).toBeVisible()
})

test('leaving the description empty names what is needed', async ({ page }) => {
  await page.goto('/')

  // Tab rather than focusing the action, which is held inactive on an empty
  // description and so cannot take focus to blur the field.
  await page.getByLabel('Describe your system').click()
  await page.keyboard.press('Tab')

  await expect(
    page.getByText('A description is needed before this can be answered.'),
  ).toBeVisible()
})

test('an answered question renders each claim over the text it rests on', async ({
  page,
}) => {
  await serviceAnswers(page, ANSWER)
  await page.goto('/')

  await describeSystem(page)

  await expect(
    page.getByText('The chatbot has to tell the person'),
  ).toBeVisible()
  // Scoped to the answer column, since the docked pane lists the same citation
  // among the provisions the answer cites.
  await expect(page.getByRole('main').getByText('Article 50(1)')).toBeVisible()
  await expect(
    page.getByRole('main').getByText('Providers shall ensure'),
  ).toBeVisible()
})

test('the trace reports cost without being opened, and opens to the ids', async ({
  page,
}) => {
  await serviceAnswers(page, ANSWER)
  await page.goto('/')

  await describeSystem(page)
  await expect(page.getByText('18 420 prompt')).toBeVisible()

  await page.getByRole('contentinfo').getByRole('button').click()

  // The definition-list term, scoped past the drawing's own column label,
  // which repeats the same word as the graph's leftmost hop.
  await expect(
    page.getByRole('term').getByText('searched', { exact: true }),
  ).toBeVisible()
  await expect(
    page.getByRole('term').getByText('dropped', { exact: true }),
  ).toBeVisible()
  // Raw ids, which is how both the wireframe and the settled design draw them.
  await expect(page.getByText('art_50, art_50.1')).toBeVisible()
})

test('a refusal renders as a result rather than as a failure', async ({
  page,
}) => {
  await serviceAnswers(page, {
    ...ANSWER,
    claims: [],
    refusal: {
      reason: 'The Act never defines the threshold.',
      missing: ['what counts as a substantial modification'],
      consulted: ANSWER.claims[0].citations,
    },
  })
  await page.goto('/')

  await describeSystem(page, 'quarterly retraining of a credit model')

  await expect(page.getByText('The text does not settle this')).toBeVisible()
  // Scoped to the surface. The dev server mounts an alert of its own outside
  // the app root, which a page-wide query would count as a failure region.
  await expect(page.getByRole('main').getByRole('alert')).toHaveCount(0)
})

test('the trace disclosure draws the walk above the id lists', async ({
  page,
}) => {
  await serviceAnswers(page, ANSWER)
  await page.goto('/')

  await describeSystem(page)
  await page.getByRole('contentinfo').getByRole('button').click()

  await expect(page.getByRole('img', { name: /The walk,/ })).toBeVisible()
  // The lists stay, as the drawing's text equivalent.
  await expect(
    page.getByRole('term').getByText('searched', { exact: true }),
  ).toBeVisible()
})

test('a refusal draws the walk too, since it names what was consulted', async ({
  page,
}) => {
  await serviceAnswers(page, {
    ...ANSWER,
    claims: [],
    refusal: {
      reason: 'The Act never defines the threshold.',
      missing: ['what counts as a substantial modification'],
      consulted: ANSWER.claims[0].citations,
    },
  })
  await page.goto('/')

  await describeSystem(page, 'quarterly retraining of a credit model')
  await page.getByRole('contentinfo').getByRole('button').click()

  await expect(page.getByRole('img', { name: /The walk,/ })).toBeVisible()
})

test('a trace with no edges degrades to the id lists rather than an empty frame', async ({
  page,
}) => {
  await serviceAnswers(page, {
    ...ANSWER,
    retrieval: { ...ANSWER.retrieval, edges: [] },
  })
  await page.goto('/')

  await describeSystem(page)
  await page.getByRole('contentinfo').getByRole('button').click()

  await expect(page.getByRole('img', { name: /The walk,/ })).toHaveCount(0)
  await expect(page.getByText('searched', { exact: true })).toBeVisible()
})

test('a service that is not running names the port rather than stalling', async ({
  page,
}) => {
  await page.goto('/')

  await describeSystem(page)

  await expect(
    page.getByText('Nothing is listening on the service port.'),
  ).toBeVisible()
  await expect(page.getByText('The service is not running.')).toBeVisible()
})

test('a named service failure carries a correlation id a reader can quote', async ({
  page,
}) => {
  await serviceAnswers(
    page,
    {
      state: 'unavailable',
      detail: 'the surface renders its own copy rather than this',
      correlationId: '8f2a-41d7',
    },
    503,
  )
  await page.goto('/')

  await describeSystem(page)

  await expect(
    page.getByText('The model or the index is not running.'),
  ).toBeVisible()
  await expect(page.getByText('correlation 8f2a-41d7')).toBeVisible()
})

test('a recorded pick on the local build asks the real service', async ({
  page,
}) => {
  await serviceAnswers(page, ANSWER)
  await page.goto('/')

  await expect(
    page.getByText('Or read one of the recorded questions'),
  ).toBeVisible()
  await page.getByRole('button', { name: /answers customer questions/ }).click()

  await expect(
    page.getByText('The chatbot has to tell the person'),
  ).toBeVisible()
})

test('the terms strip gathers the load-bearing definitions', async ({
  page,
}) => {
  await page.goto('/')

  await expect(page.getByText('Terms used on this page')).toBeVisible()
  await expect(
    page.getByText('General-purpose AI model', { exact: true }),
  ).toBeVisible()
})

test('the top bar links to the repository and the evaluation', async ({
  page,
}) => {
  await page.goto('/')

  await expect(page.getByRole('link', { name: 'Repository' })).toHaveAttribute(
    'href',
    'https://github.com/erclx/annex',
  )
  await expect(page.getByRole('link', { name: 'Evaluation' })).toHaveAttribute(
    'href',
    'https://github.com/erclx/annex/blob/main/docs/evaluation.md',
  )
})

test('a citation carries a quieter EUR-Lex link beside its heading', async ({
  page,
}) => {
  await serviceAnswers(page, ANSWER)
  await page.goto('/')

  await describeSystem(page)

  await expect(page.getByRole('link', { name: /EUR-Lex/ })).toHaveAttribute(
    'href',
    'https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:02024R1689-20260727#art_50',
  )
})

test.describe('the frame at 1280 pixels', () => {
  test.use({ viewport: { width: 1280, height: 860 } })

  test('the top bar stays pinned and slims once the answer scrolls under it', async ({
    page,
  }) => {
    await serviceAnswers(page, LONG_ANSWER)
    await page.goto('/')
    await describeSystem(page)
    await expect(page.getByRole('contentinfo')).toBeVisible()

    await page.mouse.wheel(0, 900)

    const banner = page.getByRole('banner')
    await expect.poll(async () => (await banner.boundingBox())?.y).toBe(0)
    await expect(banner.getByRole('link', { name: 'Repository' })).toHaveCount(
      0,
    )
    await expect(
      banner.getByRole('group', { name: 'Which text to read against' }),
    ).toBeInViewport()
  })

  test('the docked pane ends at the fold before the page scrolls', async ({
    page,
  }) => {
    await serviceAnswers(page, LONG_ANSWER)
    await page.goto('/')
    await describeSystem(page)

    const pane = page.getByRole('complementary', { name: 'The Act' })
    await expect(pane).toBeVisible()

    // The class height is only the first frame. The pane's own effect sets an
    // inline height of the viewport less its top, so at scroll 0 a pane seated
    // below the described system still ends at the fold.
    await expect
      .poll(async () => {
        const box = await pane.boundingBox()
        return box ? Math.round(box.y + box.height) : Infinity
      })
      .toBeLessThanOrEqual(861)
  })

  test('the column handle resizes the answer and the width holds through a reload', async ({
    page,
  }) => {
    await serviceAnswers(page, ANSWER)
    await page.goto('/')
    await describeSystem(page)

    const handle = page.getByRole('separator', {
      name: 'Resize the answer and the Act',
    })
    const box = await handle.boundingBox()
    const x = (box?.x ?? 0) + (box?.width ?? 0) / 2
    const y = (box?.y ?? 0) + 200
    await page.mouse.move(x, y)
    await page.mouse.down()
    await page.mouse.move(x - 120, y, { steps: 6 })
    await page.mouse.up()

    await expect(handle).toHaveAttribute('aria-valuenow', '520')

    await page.reload()

    await expect
      .poll(() =>
        page.evaluate(() =>
          document.documentElement.style.getPropertyValue(
            '--annex-answer-width',
          ),
        ),
      )
      .toBe('520px')
  })

  test('the column handle stops at 480 pixels and resets on a double-click', async ({
    page,
  }) => {
    await serviceAnswers(page, ANSWER)
    await page.goto('/')
    await describeSystem(page)

    const handle = page.getByRole('separator', {
      name: 'Resize the answer and the Act',
    })
    await handle.focus()
    for (const _ of Array.from({ length: 12 }))
      await page.keyboard.press('ArrowLeft')

    await expect(handle).toHaveAttribute('aria-valuenow', '480')

    await handle.dblclick()

    await expect(handle).toHaveAttribute('aria-valuenow', '640')
  })
})
