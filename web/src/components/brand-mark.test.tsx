import { readFileSync } from 'node:fs'
import path from 'node:path'

import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { BrandMark } from '@/components/brand-mark'

const FAVICON_PATH = path.resolve(__dirname, '../../public/favicon.svg')

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
