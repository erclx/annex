/**
 * Stands in for `POST /ask/stream` in a real browser.
 *
 * Two shapes, because Playwright's `route.fulfill` delivers a whole body and
 * closes it. A finished run is a closed body, so `streamAnswers` routes it. A
 * run caught mid-draft needs a body that stays open, which no route stub can
 * give, so `holdStreamOpen` swaps the page's own `fetch` for that one path
 * before any script runs and hands back a stream that never closes.
 *
 * The frames are the ones the deployed build plays for the same recording, so
 * the e2e cases and the captured evidence read ids a real pipeline reached
 * rather than ids typed here.
 */
import type { Page } from '@playwright/test'

import type { Answer } from '../src/lib/answer'
import { playbackSchedule } from '../src/lib/replay-playback'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
}

function frame(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
}

/** The node frames a recording's run sends, up to and including `through`. */
export function nodeFrames(answer: Answer, through?: string): string {
  const nodes = playbackSchedule(answer).map(({ node }) => node)
  const last = through
    ? nodes.findIndex((node) => node.node === through)
    : nodes.length - 1
  return nodes
    .slice(0, last + 1)
    .map((node) =>
      frame(
        'node',
        Object.fromEntries(
          Object.entries(node).filter(([, value]) => value !== null),
        ),
      ),
    )
    .join('')
}

/**
 * Answers the stream route with a finished run, or with the JSON body a
 * failure before any frame carries, and `/ask` the same way for anything
 * still asking it.
 */
export async function streamAnswers(page: Page, body: unknown, status = 200) {
  const isAnswer = status === 200
  await page.route('**/ask/stream', async (route) => {
    if (route.request().method() === 'OPTIONS') {
      await route.fulfill({ status: 204, headers: CORS })
      return
    }
    await route.fulfill(
      isAnswer
        ? {
            status,
            headers: { ...CORS, 'Content-Type': 'text/event-stream' },
            body: nodeFrames(body as Answer) + frame('answer', body),
          }
        : {
            status,
            headers: { ...CORS, 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          },
    )
  })
}

/** Sends a recording's frames up to `through`, then holds the stream open. */
export async function holdStreamOpen(
  page: Page,
  answer: Answer,
  through: string,
) {
  await page.addInitScript(
    (text: string) => {
      const original = window.fetch.bind(window)
      window.fetch = (input, init) => {
        const url =
          typeof input === 'string'
            ? input
            : input instanceof URL
              ? input.href
              : input.url
        if (!url.endsWith('/ask/stream')) return original(input, init)
        const body = new ReadableStream<Uint8Array>({
          start(controller) {
            controller.enqueue(new TextEncoder().encode(text))
          },
        })
        return Promise.resolve(
          new Response(body, {
            status: 200,
            headers: { 'Content-Type': 'text/event-stream' },
          }),
        )
      }
    },
    nodeFrames(answer, through),
  )
}
