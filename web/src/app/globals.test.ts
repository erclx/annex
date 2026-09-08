import { readFileSync } from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

/**
 * The dark palette is written twice in `globals.css` and the two have to agree.
 *
 * One block applies when the reader has expressed no preference and the system
 * asks for dark. The other applies when the reader chose dark outright. CSS has
 * no way to share a declaration block between a media query and a selector, so
 * the repetition is deliberate and the drift is the hazard.
 *
 * Nothing else catches it. A value edited in one block and not the other leaves
 * the surface correct for whichever path the editor happened to look at, and
 * wrong for the other, which is exactly the case a person testing their own
 * change never opens.
 */
const CSS = readFileSync(
  path.join(process.cwd(), 'src/app/globals.css'),
  'utf8',
)

/** The declaration body following a selector, matched by brace depth. */
function blockAfter(marker: string): string {
  const at = CSS.indexOf(marker)
  if (at === -1) throw new Error(`no block in globals.css for: ${marker}`)

  const open = CSS.indexOf('{', at + marker.length)
  let depth = 0
  for (let i = open; i < CSS.length; i += 1) {
    if (CSS[i] === '{') depth += 1
    if (CSS[i] === '}') {
      depth -= 1
      if (depth === 0) return CSS.slice(open + 1, i)
    }
  }
  throw new Error(`unbalanced braces after: ${marker}`)
}

function tokensIn(block: string): Map<string, string> {
  const found = new Map<string, string>()
  for (const [, name, value] of block.matchAll(
    /(--[a-z-]+):\s*([^;]+);/g,
  ) as Iterable<RegExpMatchArray>) {
    found.set(name, value.trim())
  }
  return found
}

const systemDark = tokensIn(blockAfter(":root:not([data-theme='light'])"))
const chosenDark = tokensIn(blockAfter(":root[data-theme='dark']"))

describe('the two dark palettes', () => {
  it('are both present, so neither selector was dropped in an edit', () => {
    expect(systemDark.size).toBeGreaterThan(0)
    expect(chosenDark.size).toBeGreaterThan(0)
  })

  it('carry the same tokens', () => {
    expect([...chosenDark.keys()].sort()).toEqual([...systemDark.keys()].sort())
  })

  it('carry the same value for every token', () => {
    expect(Object.fromEntries(chosenDark)).toEqual(
      Object.fromEntries(systemDark),
    )
  })

  it('override every token the light palette declares as a color', () => {
    const light = tokensIn(blockAfter(':root {'))
    const colors = [...light.keys()].filter(
      (name) => !name.startsWith('--font-'),
    )

    expect([...systemDark.keys()].sort()).toEqual(colors.sort())
  })
})
