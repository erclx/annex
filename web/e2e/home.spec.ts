import { expect, type Page, test } from '@playwright/test'

import { REPLAY_URL } from '../playwright.config'
import recorded from '../src/fixtures/q01-support-chatbot.consolidated.json'
import type { Answer } from '../src/lib/service/answer'
import { holdStreamOpen, SERVICE_ASK, streamAnswers } from './stream-stub'

/** A real recording, 12 searched and 40 traversed, for cases about the walk's size. */
const RECORDED = recorded as Answer

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
    uncited_ids: [],
    edges: [{ source_id: 'art_50', target_id: 'art_50.2', hop: 1 }],
    traversal_enabled: true,
    truncated: false,
    prompt_tokens: 18420,
    completion_tokens: 612,
    duration_ms: 21300,
    model: 'annex-qwen3-27b',
  },
}

/**
 * The page asks through `/ask/stream`, so that route carries the answer. `/ask`
 * answers the same body for a page that falls back to it.
 */
async function serviceAnswers(page: Page, body: unknown, status = 200) {
  await streamAnswers(page, body, status)
  await page.route(SERVICE_ASK, async (route) => {
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
    page.getByText('Describe your AI system. Get back the articles'),
  ).toBeVisible()
  await expect(
    page.getByText("It won't tell you whether you comply"),
  ).toBeVisible()
})

test('an empty description is named as needed on submit and not on leaving the box', async ({
  page,
}) => {
  const needed = page.getByText(
    'A description is needed before this can be answered.',
  )
  await page.goto('/')

  await page.getByLabel('Describe your system').click()
  await page.keyboard.press('Tab')
  await expect(needed).toHaveCount(0)

  await page.getByRole('button', { name: 'Find the articles' }).click()
  await expect(needed).toBeVisible()
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

  // The definition-list term, scoped to the id lists under the chips rather
  // than to any text on the page reading the same word.
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

test('the trace opens the walk as chips above the id lists', async ({
  page,
}) => {
  await serviceAnswers(page, ANSWER)
  await page.goto('/')

  await describeSystem(page)
  await page.getByRole('contentinfo').getByRole('button').click()

  await expect(page.getByRole('group', { name: /^The walk,/ })).toBeVisible()
  await expect(
    page.getByRole('button', { name: 'Article 50(2)' }),
  ).toBeVisible()
  // The raw id lists stay under the chips.
  await expect(
    page.getByRole('term').getByText('searched', { exact: true }),
  ).toBeVisible()
})

test('a chip in the walk opens its provision in the Act', async ({ page }) => {
  await serviceAnswers(page, ANSWER)
  await page.goto('/')

  await describeSystem(page)
  await page.getByRole('contentinfo').getByRole('button').click()
  await page.getByRole('button', { name: 'Article 50(2)' }).focus()
  await page.keyboard.press('Enter')

  await expect(
    page
      .getByRole('complementary', { name: 'The Act' })
      .getByRole('button', { name: 'The Act' }),
  ).toHaveAttribute('aria-pressed', 'true')
})

test('the wait shows the steps and fills the pane while the model drafts', async ({
  page,
}) => {
  await holdStreamOpen(page, ANSWER as Answer, 'budget')
  await page.goto('/')

  await describeSystem(page)

  const steps = page.getByRole('region', { name: 'The agent working' })
  await expect(steps.getByText('Query ready')).toBeVisible()
  await expect(
    steps.getByText(
      /^1 of the 3 provisions found set aside|found fit the prompt budget$/,
    ),
  ).toBeVisible()
  await expect(
    page.getByRole('complementary', { name: 'The agent working' }),
  ).toBeVisible()
  await expect(page.getByText(/^Being read by the model · 1 of/)).toBeVisible()
})

test.describe('motion while a question runs', () => {
  test('the running step pulses, and holds still for a reader who asked for less motion', async ({
    page,
  }) => {
    await holdStreamOpen(page, RECORDED, 'traverse')
    await page.goto('/')
    await describeSystem(page)

    const running = page
      .getByRole('region', { name: 'The agent working' })
      .locator('li[aria-current="step"] > span')
      .first()
    await expect
      .poll(() => running.evaluate((el) => getComputedStyle(el).animationName))
      .toBe('step-pulse')

    await page.emulateMedia({ reducedMotion: 'reduce' })
    await expect
      .poll(() => running.evaluate((el) => getComputedStyle(el).animationName))
      .toBe('none')
  })

  test('the walk grows until every provision it reached is shown', async ({
    page,
  }) => {
    await holdStreamOpen(page, RECORDED, 'traverse')
    await page.goto('/')
    await describeSystem(page)

    const chips = page
      .getByRole('complementary', { name: 'The agent working' })
      .getByRole('button')
    await expect(chips.first()).toBeVisible()
    expect(await chips.count()).toBeLessThan(52)
    await expect(chips).toHaveCount(52)
  })

  test('the reading card steps to the next supplied provision', async ({
    page,
  }) => {
    await holdStreamOpen(page, RECORDED, 'budget')
    await page.goto('/')
    await describeSystem(page)

    await expect(
      page.getByText(/^Being read by the model · 1 of \d+ supplied$/),
    ).toBeVisible()
    await expect(
      page.getByText(/^Being read by the model · 2 of \d+ supplied$/),
    ).toBeVisible()
  })
})

test('hovering a chip fades the provisions off its path', async ({ page }) => {
  await serviceAnswers(page, RECORDED)
  await page.goto('/')
  await describeSystem(page)
  await page.getByRole('contentinfo').getByRole('button').click()

  const walk = page.getByRole('group', { name: /^The walk,/ })
  await walk.getByRole('button', { name: /^Article 102/ }).hover()

  await expect(
    walk.getByRole('button', { name: /^Article 2$/ }),
  ).toHaveAttribute('data-traced', 'true')
  await expect
    .poll(() =>
      walk
        .getByRole('button', { name: /^Article 13\(1\)$/ })
        .evaluate((el) => getComputedStyle(el).opacity),
    )
    .toBe('0.4')
})

test.describe('the finished walk at 400 pixels', () => {
  test.use({ viewport: { width: 400, height: 860 } })

  test('expands as chips in place under the cost line', async ({ page }) => {
    await serviceAnswers(page, RECORDED)
    await page.goto('/')
    await describeSystem(page)

    const trace = page.getByRole('contentinfo')
    await trace.getByRole('button', { expanded: false }).click()

    await expect(trace.getByRole('group', { name: /^The walk,/ })).toBeVisible()
    await expect(
      trace.getByRole('button', { name: /^Article 50\(1\)$/ }),
    ).toBeVisible()
  })
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

  await expect(page.getByRole('group', { name: /^The walk,/ })).toBeVisible()
})

test('a trace with traversal off keeps search alone rather than an empty frame', async ({
  page,
}) => {
  await serviceAnswers(page, {
    ...ANSWER,
    retrieval: {
      ...ANSWER.retrieval,
      traversed_ids: [],
      edges: [],
      traversal_enabled: false,
    },
  })
  await page.goto('/')

  await describeSystem(page)
  await page.getByRole('contentinfo').getByRole('button').click()

  const walk = page.getByRole('group', { name: /^The walk,/ })
  await expect(
    walk.getByRole('button', { name: 'Article 50(1)' }),
  ).toBeVisible()
  await expect(page.getByText('Their article')).toHaveCount(0)
  await expect(
    page.getByRole('term').getByText('searched', { exact: true }),
  ).toBeVisible()
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
    page.getByText('Or start from a recorded question'),
  ).toBeVisible()
  await page.getByRole('button', { name: /answers customer questions/ }).click()

  await expect(
    page.getByText('The chatbot has to tell the person'),
  ).toBeVisible()
})

test('the terms strip gathers the load-bearing definitions', async ({
  page,
}) => {
  await page.goto('/evaluation')

  await expect(page.getByText('Terms used on this page')).toBeVisible()
  await expect(
    page.getByText('General-purpose AI model', { exact: true }),
  ).toBeVisible()
})

test('the top bar links home, opens the evaluation in-site, and links the repository as an icon', async ({
  page,
}) => {
  await page.goto('/')

  await expect(
    page.getByRole('link', { name: 'Home', exact: true }),
  ).toHaveAttribute('href', '/')
  await expect(page.getByRole('link', { name: 'Evaluation' })).toHaveAttribute(
    'href',
    '/evaluation',
  )
  await expect(
    page.getByRole('link', { name: 'Repository on GitHub' }),
  ).toHaveAttribute('href', 'https://github.com/erclx/annex')
})

test('Home in the top bar returns from the evaluation route to the landing page', async ({
  page,
}) => {
  await page.goto('/evaluation')

  await page.getByRole('link', { name: 'Home', exact: true }).click()

  await expect(page).toHaveURL('/')
})

test.describe('the evaluation route', () => {
  test('/ ends after the recorded questions with no terms strip or comparison', async ({
    page,
  }) => {
    await page.goto('/')

    await expect(
      page.getByText('Or start from a recorded question'),
    ).toBeVisible()
    await expect(page.getByText('Terms used on this page')).toHaveCount(0)
    await expect(
      page.getByRole('heading', { name: 'The three-arm comparison' }),
    ).toHaveCount(0)
  })

  test('the bar link and the composer line both reach /evaluation', async ({
    page,
  }) => {
    await page.goto('/')

    await page
      .getByRole('link', { name: 'How answers are built and measured →' })
      .click()
    await expect(page).toHaveURL(/\/evaluation$/)
    await expect(
      page.getByRole('heading', { name: 'Evaluation' }),
    ).toBeVisible()

    await page.goto('/')
    await page.getByRole('link', { name: 'Evaluation' }).click()
    await expect(page).toHaveURL(/\/evaluation$/)
    await expect(
      page.getByRole('heading', { name: 'Evaluation' }),
    ).toBeVisible()
  })

  test('the built export resolves the route the way it resolves /ask', async ({
    page,
  }) => {
    await page.goto(`${REPLAY_URL}/evaluation`)

    await expect(
      page.getByRole('heading', { name: 'Evaluation' }),
    ).toBeVisible()
    await expect(
      page.getByRole('heading', { name: 'The three-arm comparison' }),
    ).toBeVisible()
  })
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

test('a submit opens the answer on the ask route', async ({ page }) => {
  await serviceAnswers(page, ANSWER)
  await page.goto('/')

  await describeSystem(page)

  await expect(page).toHaveURL(/\/ask\?v=consolidated/)
  await expect(
    page.getByText('The chatbot has to tell the person'),
  ).toBeVisible()
})

test('the mark in the bar returns an answer to the landing page with the text kept', async ({
  page,
}) => {
  await serviceAnswers(page, ANSWER)
  await page.goto('/')
  await describeSystem(page)
  await expect(
    page.getByText('The chatbot has to tell the person'),
  ).toBeVisible()

  await page.getByRole('link', { name: 'Annex' }).click()

  await expect(page).toHaveURL(/\/$/)
  await expect(page.getByLabel('Describe your system')).toHaveValue(
    'a customer chatbot',
  )
})

test('Edit description returns to the landing page with the text in the composer', async ({
  page,
}) => {
  await serviceAnswers(page, ANSWER)
  await page.goto('/')
  await describeSystem(page)
  await expect(
    page.getByText('The chatbot has to tell the person'),
  ).toBeVisible()

  await page.getByRole('button', { name: 'Edit description' }).click()

  await expect(page).toHaveURL(/\/$/)
  await expect(page.getByLabel('Describe your system')).toHaveValue(
    'a customer chatbot',
  )
})

test('a bare visit to the ask route has nothing to ask and returns to the landing page', async ({
  page,
}) => {
  await serviceAnswers(page, ANSWER)

  await page.goto('/ask')

  await expect(page).toHaveURL(/\/$/)
  await expect(
    page.getByRole('heading', { name: /Describe your AI system/ }),
  ).toBeVisible()
})

test('a recorded question card answers hover by changing its border', async ({
  page,
}) => {
  await page.goto('/')
  const card = page.getByRole('button', { name: /answers customer questions/ })
  const borderAtRest = await card.evaluate(
    (element) => getComputedStyle(element).borderTopColor,
  )

  await card.hover()

  await expect
    .poll(() =>
      card.evaluate((element) => getComputedStyle(element).borderTopColor),
    )
    .not.toBe(borderAtRest)
})

/**
 * How far the rail's bracket sits from the widest stage text, in pixels.
 *
 * Every stage row sits in the rail's second grid column, so the widest of those
 * is where the stage text ends. The column is read off the computed style
 * rather than the `style` attribute, because the server writes that attribute
 * as `grid-column:2` with no space and hydration leaves it as written.
 *
 * The figure carries both drawings in the DOM at every width, one hidden by
 * a `hidden @min-[657px]:...` class pair per `pipeline-diagram.tsx`, so this
 * reads the visible wrapper's own grid rather than the figure's first child,
 * which is a wrapper div rather than the grid itself.
 *
 * Measured on `/evaluation`, where the figure is a section of its own.
 */
async function bracketGap(page: Page): Promise<number> {
  const rail = page.getByRole('img', { name: /The five-stage pipeline/ })
  await expect(rail).toBeVisible()

  return rail.evaluate((figure) => {
    const wrapper = [...figure.children].find(
      (child) => getComputedStyle(child).display !== 'none',
    )
    const grid = wrapper?.firstElementChild
    const stageRights = [...(grid?.children ?? [])]
      .filter((child) => getComputedStyle(child).gridColumnStart === '2')
      .map((stage) => stage.getBoundingClientRect().right)
    const bracket = wrapper?.querySelector('svg')
    return (
      (bracket?.getBoundingClientRect().left ?? Infinity) -
      Math.max(...stageRights)
    )
  })
}

/** The vertical offset between the comparison's two half headings, in pixels. */
async function halfHeadingOffset(page: Page): Promise<number> {
  const built = await page
    .getByRole('heading', { name: 'How an answer is built' })
    .boundingBox()
  const compared = await page
    .getByRole('heading', { name: 'The three-arm comparison' })
    .boundingBox()
  return Math.abs((built?.y ?? 0) - (compared?.y ?? Infinity))
}

/**
 * Which of the pipeline figure's two drawings is showing, and how the
 * stage labels in it are sized and how much width they leave unfilled.
 *
 * The two drawings both sit in the DOM at every width, one hidden by a
 * `hidden @min-[657px]:...` class pair per `pipeline-diagram.tsx`, so this
 * reads which one `display` actually shows rather than which one the
 * component chose to render.
 */
async function pipelineRowShape(page: Page): Promise<{
  rowShowing: boolean
  labelFontSizes: string[]
  emptyRight: number
}> {
  const figure = page.getByRole('img', { name: /The five-stage pipeline/ })
  await expect(figure).toBeVisible()

  return figure.evaluate((el) => {
    const railWrapper = el.children[0] as HTMLElement
    const rowWrapper = el.children[1] as HTMLElement
    const rowShowing = getComputedStyle(rowWrapper).display !== 'none'
    const showing = rowShowing ? rowWrapper : railWrapper

    const labels = [...showing.querySelectorAll('div')].filter((div) =>
      div.className.includes('font-semibold'),
    )
    const labelFontSizes = labels.map(
      (label) => getComputedStyle(label).fontSize,
    )

    const figRight = el.getBoundingClientRect().right
    const maxLabelRight = Math.max(
      ...labels.map((label) => label.getBoundingClientRect().right),
    )
    const emptyRight = rowShowing ? figRight - maxLabelRight : 0

    return { rowShowing, labelFontSizes, emptyRight }
  })
}

test.describe('the comparison on the landing page', () => {
  test('sets the rail beside the table at 1280 pixels', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 860 })
    await page.goto('/evaluation')

    expect(await halfHeadingOffset(page)).toBeLessThanOrEqual(1)
  })

  test('stacks the rail above the table at 400 pixels', async ({ page }) => {
    await page.setViewportSize({ width: 400, height: 860 })
    await page.goto('/evaluation')

    expect(await halfHeadingOffset(page)).toBeGreaterThan(100)
  })

  test('draws the row, not the rail, at 810 pixels while stacked', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 810, height: 860 })
    await page.goto('/evaluation')

    expect(await halfHeadingOffset(page)).toBeGreaterThan(100)

    const shape = await pipelineRowShape(page)
    expect(shape.rowShowing).toBe(true)
    for (const fontSize of shape.labelFontSizes) {
      expect(parseFloat(fontSize)).toBeGreaterThanOrEqual(11)
    }
    expect(shape.emptyRight).toBeLessThanOrEqual(20)
  })

  test('draws the row, not the rail, at 1024 pixels while stacked', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1024, height: 860 })
    await page.goto('/evaluation')

    expect(await halfHeadingOffset(page)).toBeGreaterThan(100)

    const shape = await pipelineRowShape(page)
    expect(shape.rowShowing).toBe(true)
    for (const fontSize of shape.labelFontSizes) {
      expect(parseFloat(fontSize)).toBeGreaterThanOrEqual(11)
    }
    expect(shape.emptyRight).toBeLessThanOrEqual(20)
  })
})

const LOCAL_HINT = 'Turn off to compare against search alone'

test.describe('the landing page at 1280 pixels', () => {
  test.use({ viewport: { width: 1280, height: 860 } })

  test('centers the composer under a larger heading', async ({ page }) => {
    await page.goto('/')

    const composer = await page.getByTestId('composer').boundingBox()
    const center = (composer?.x ?? 0) + (composer?.width ?? 0) / 2
    expect(Math.abs(center - 640)).toBeLessThanOrEqual(2)
    await expect(
      page.getByRole('heading', { name: /Describe your AI system/ }),
    ).toHaveCSS('font-size', '34px')
  })

  test('keeps the traversal hint as visible text in the composer', async ({
    page,
  }) => {
    await page.goto('/')

    await expect(
      page.getByTestId('composer').getByText(LOCAL_HINT),
    ).toBeVisible()
  })

  test('keeps the traversal hint as visible text in the bar once asked', async ({
    page,
  }) => {
    await serviceAnswers(page, ANSWER)
    await page.goto('/')
    await describeSystem(page)

    await expect(
      page.getByRole('banner').first().getByText(LOCAL_HINT),
    ).toBeVisible()
  })
})

test.describe('the landing page at 400 pixels', () => {
  test.use({ viewport: { width: 400, height: 860 } })

  test('keeps the composer on the left gutter with its hint visible', async ({
    page,
  }) => {
    await page.goto('/')

    const composer = page.getByTestId('composer')
    expect((await composer.boundingBox())?.x).toBe(24)
    await expect(composer.getByText(LOCAL_HINT)).toBeVisible()
  })
})

test.describe('the frame at 1536 pixels', () => {
  test.use({ viewport: { width: 1536, height: 860 } })

  test('the pipeline bracket sits beside the stage text', async ({ page }) => {
    await page.goto('/evaluation')

    // The rail's column gap is 12 pixels, and the bracket should sit that far
    // from the stage text. Its column used to sit past a `1fr` stage column,
    // which the operator's second-use pass measured at 657 pixels away.
    expect(await bracketGap(page)).toBeLessThanOrEqual(16)
  })

  test('the docked pane ends at the fold before the page scrolls', async ({
    page,
  }) => {
    await serviceAnswers(page, LONG_ANSWER)
    await page.goto('/')
    await describeSystem(page)

    const pane = page.getByRole('complementary', { name: 'The Act' })
    await expect(pane).toBeVisible()

    await expect
      .poll(async () => {
        const box = await pane.boundingBox()
        return box ? Math.round(box.y + box.height) : Infinity
      })
      .toBeLessThanOrEqual(861)
  })
})

test.describe('the frame at 1280 pixels', () => {
  test.use({ viewport: { width: 1280, height: 860 } })

  test('the pipeline bracket sits beside the stage text', async ({ page }) => {
    await page.goto('/evaluation')

    expect(await bracketGap(page)).toBeLessThanOrEqual(16)
  })

  test('the top bar stays pinned at full height once the answer scrolls under it', async ({
    page,
  }) => {
    await serviceAnswers(page, LONG_ANSWER)
    await page.goto('/')
    await describeSystem(page)
    await expect(page.getByRole('contentinfo')).toBeVisible()
    const banner = page.getByRole('banner').first()
    const heightBefore = (await banner.boundingBox())?.height

    await page.mouse.wheel(0, 900)

    await expect.poll(async () => (await banner.boundingBox())?.y).toBe(0)
    await expect
      .poll(async () => (await banner.boundingBox())?.height)
      .toBe(heightBefore)
    await expect(
      banner.getByRole('link', { name: 'Repository on GitHub' }),
    ).toBeInViewport()
    await expect(
      banner.getByRole('switch', { name: 'Reference traversal' }),
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
    // inline height of the viewport less its top, so at scroll 0 the pane,
    // which now starts under the bar with the described system inside the
    // answer column beside it, still ends at the fold.
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
