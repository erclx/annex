import { readFileSync } from 'node:fs'
import path from 'node:path'

import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { BrandMark } from '@/components/brand-mark'

const FAVICON_PATH = path.resolve(__dirname, '../../public/favicon.svg')
const GLOBALS_CSS_PATH = path.resolve(__dirname, '../app/globals.css')

/**
 * The declaration body following a selector, matched by brace depth. Copied
 * from `globals.test.ts` rather than imported, since that file exports
 * nothing and each test file here reads `globals.css` on its own.
 */
function blockAfter(css: string, marker: string): string {
  const at = css.indexOf(marker)
  if (at === -1) throw new Error(`no block in globals.css for: ${marker}`)

  const open = css.indexOf('{', at)
  let depth = 0
  for (let i = open; i < css.length; i += 1) {
    if (css[i] === '{') depth += 1
    if (css[i] === '}') {
      depth -= 1
      if (depth === 0) return css.slice(open + 1, i)
    }
  }
  throw new Error(`unbalanced braces after: ${marker}`)
}

function tokenIn(block: string, name: string): string {
  const match = new RegExp(`${name}:\\s*([^;]+);`).exec(block)
  if (!match) throw new Error(`no ${name} token in block`)
  return match[1].trim()
}

/**
 * The three edges and four nodes as `(x1,y1,x2,y2)` and `(cx,cy,r)` tuples,
 * in document order, read off whatever markup is handed in. `favicon.svg`
 * and `BrandMark`'s rendered output are both markup of this shape, so the
 * same extraction reads the geometry off either one.
 */
function geometryOf(markup: string): string[] {
  const lines = [...markup.matchAll(/<line\b[^>]*>/g)].map((match) => {
    const tag = match[0]
    const value = (name: string) =>
      new RegExp(`${name}="([^"]+)"`).exec(tag)?.[1]
    return `line:${value('x1')},${value('y1')},${value('x2')},${value('y2')}`
  })

  const circles = [...markup.matchAll(/<circle\b[^>]*>/g)].map((match) => {
    const tag = match[0]
    const value = (name: string) =>
      new RegExp(`${name}="([^"]+)"`).exec(tag)?.[1]
    return `circle:${value('cx')},${value('cy')},${value('r')}`
  })

  return [...lines, ...circles]
}

describe('BrandMark', () => {
  it('should draw the same edges and nodes as the favicon, so the two never drift apart', () => {
    const favicon = readFileSync(FAVICON_PATH, 'utf8')
    const { container } = render(<BrandMark />)

    expect(geometryOf(container.innerHTML)).toEqual(geometryOf(favicon))
  })
})

/**
 * The favicon hardcodes its colors, since a browser fetches it on its own
 * and never sees the page's custom properties. That is correct, and it is
 * what makes the hardcoded values a second place the palette can drift from:
 * the geometry test above only compares shapes, so a token changed in
 * `globals.css` and never carried into `favicon.svg` would leave both tests
 * green and the tab-strip mark wrong. These assert the favicon's light and
 * dark hex values against the tokens themselves, parsed out of the same
 * file `globals.test.ts` reads.
 */
describe("the favicon's hardcoded colors", () => {
  const favicon = readFileSync(FAVICON_PATH, 'utf8')
  const css = readFileSync(GLOBALS_CSS_PATH, 'utf8')

  const lightInk = tokenIn(blockAfter(css, ':root {'), '--ink')
  const lightAccent = tokenIn(blockAfter(css, ':root {'), '--accent')
  const darkInk = tokenIn(
    blockAfter(css, ":root:not([data-theme='light'])"),
    '--ink',
  )
  const darkAccent = tokenIn(
    blockAfter(css, ":root:not([data-theme='light'])"),
    '--accent',
  )

  it('matches the light ink and accent tokens', () => {
    expect(favicon.toLowerCase()).toContain(lightInk.toLowerCase())
    expect(favicon.toLowerCase()).toContain(lightAccent.toLowerCase())
  })

  it('matches the dark ink and accent tokens', () => {
    expect(favicon.toLowerCase()).toContain(darkInk.toLowerCase())
    expect(favicon.toLowerCase()).toContain(darkAccent.toLowerCase())
  })
})
