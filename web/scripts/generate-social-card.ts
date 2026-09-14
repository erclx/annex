/**
 * Renders the social cards from a recorded answer, never typed, so a
 * re-capture that changes the claim changes the card. Reads the recruitment
 * claim and its Annex III excerpt out of
 * `src/fixtures/q04-cv-screening.consolidated.json`, the same fixture the
 * pick's candidates were drawn from, and quotes both exactly, cut only at a
 * word boundary.
 *
 * Arm 1 ships as `public/og-image.png`, the shipped card. Arm 3 ships beside
 * it as `public/og-image-alt.png`, an alternate named nowhere in the page's
 * metadata today, per pick 15 of the operator's first-use pass on
 * 2026-09-13: arm 1 beat arm 0 (today's mark, name and one line), arm 2
 * (chips from the walk, where most provisions the recording reached were
 * set aside) and arm 3 (a headline beside a cropped answer card), the last
 * of which ships anyway as this named alternate.
 */

import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { chromium } from '@playwright/test'

const FIXTURE_PATH = fileURLToPath(
  new URL(
    '../src/fixtures/q04-cv-screening.consolidated.json',
    import.meta.url,
  ),
)
const OUT_DIR = fileURLToPath(new URL('../public/', import.meta.url))

interface Citation {
  provision_id: string
  citation: string
  text: string
  changed: boolean
}

interface Claim {
  statement: string
  citations: Citation[]
}

interface Fixture {
  question: string
  claims: Claim[]
  retrieval: { searched_ids: string[]; traversed_ids: string[] }
}

function escapeHtml(text: string): string {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

function cutAtWordBoundary(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  const truncated = text.slice(0, maxLength)
  const lastSpace = truncated.lastIndexOf(' ')
  const cut = lastSpace === -1 ? truncated : truncated.slice(0, lastSpace)
  return `${cut}…`
}

/**
 * Annex III nests lettered points under numbered categories, and the
 * fixture's citation carries the whole annex rather than the one point a
 * claim rests on. The point a claim names, such as "4(a)", is read out of
 * the claim's own statement, then sliced from the category's opening colon
 * to the next lettered point.
 */
function extractPoint(text: string, category: string, letter: string): string {
  const categoryStart = new RegExp(
    `(?:^|\\s)${category}\\.\\s+[^:]*:\\s*`,
  ).exec(text)
  if (!categoryStart) {
    throw new Error(`Category ${category} not found in the Annex III text`)
  }

  const afterCategory = text.slice(
    categoryStart.index + categoryStart[0].length,
  )
  const start = afterCategory.indexOf(`(${letter})`)
  if (start === -1) {
    throw new Error(`Point (${letter}) not found under category ${category}`)
  }

  const nextLetter = String.fromCharCode(letter.charCodeAt(0) + 1)
  const end = afterCategory.indexOf(`(${nextLetter})`, start)
  return afterCategory.slice(start, end === -1 ? undefined : end).trim()
}

function loadFixture(): Fixture {
  return JSON.parse(readFileSync(FIXTURE_PATH, 'utf8'))
}

function findAnnexIIIPoint(fixture: Fixture): {
  claim: Claim
  excerpt: string
  label: string
} {
  const claim = fixture.claims.find((candidate) =>
    /Annex III point \d+\([a-z]\)/.test(candidate.statement),
  )
  if (!claim) {
    throw new Error(
      `${path.basename(FIXTURE_PATH)} carries no claim naming an Annex III point; generate-social-card.ts has nothing to quote`,
    )
  }

  const citation = claim.citations.find((c) => c.provision_id === 'anx_III')
  if (!citation) {
    throw new Error(
      'The claim names an Annex III point but carries no Annex III citation to read the excerpt from',
    )
  }
  if (citation.changed) {
    throw new Error(
      'Annex III now reads as changed by the amendment. The card states nothing about the amendment the recording does not, so its copy needs a human pass before this generator runs again.',
    )
  }

  const pointMatch = /Annex III point (\d+)\(([a-z])\)/.exec(claim.statement)
  if (!pointMatch) {
    throw new Error(
      'generate-social-card.ts could not parse the Annex III point off the claim',
    )
  }
  const [, category, letter] = pointMatch

  return {
    claim,
    excerpt: extractPoint(citation.text, category, letter),
    label: `Annex III, point ${category}(${letter})`,
  }
}

function mark(size: number): string {
  return `<svg viewBox="0 0 100 100" width="${size}" height="${size}"><line x1="22" y1="76" x2="50" y2="24" stroke="#1A1917" stroke-width="6"/><line x1="50" y1="24" x2="78" y2="56" stroke="#1A1917" stroke-width="6"/><line x1="50" y1="24" x2="78" y2="16" stroke="#1A1917" stroke-width="6"/><circle cx="22" cy="76" r="12" fill="#FAF9F7" stroke="#1A1917" stroke-width="6"/><circle cx="50" cy="24" r="13" fill="#1A1917"/><circle cx="78" cy="56" r="11" fill="#FAF9F7" stroke="#2B4C7E" stroke-width="6"/><circle cx="78" cy="16" r="9" fill="#FAF9F7" stroke="#1A1917" stroke-width="5"/></svg>`
}

const BASE_STYLE = `*{box-sizing:border-box}body{margin:0;font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;color:#1a1917}.card{width:1200px;height:630px;background:#faf9f7}.serif{font-family:Georgia,'Times New Roman',serif}`

/**
 * The picked arm: mark and name, the recorded description in quotes, the
 * claim quoted exactly and cut at a word boundary, and the Annex III excerpt
 * it rests on. Its smallest text is 26px, 13px at half size, per the pick.
 */
function armOneHtml(fixture: Fixture, claim: Claim, excerpt: string): string {
  const headline = escapeHtml(cutAtWordBoundary(claim.statement, 150))
  const question = escapeHtml(fixture.question)
  const excerptHtml = escapeHtml(excerpt)

  return `<style>${BASE_STYLE}</style><div class="card" style="padding:56px 72px;display:flex;flex-direction:column;gap:26px"><div style="display:flex;align-items:center;gap:18px">${mark(64)}<b style="font-size:52px;letter-spacing:-.02em">Annex</b><span style="font-size:26px;color:#6e6a63;margin-left:8px">which articles of the EU AI Act apply</span></div><div style="font-size:26px;color:#6e6a63">“${question}”</div><div style="font-size:30px;line-height:1.32;font-weight:600">${headline}</div><div class="serif" style="border-left:5px solid #948d81;padding-left:24px;font-size:26px;line-height:1.45;color:#4a453e">${excerptHtml}</div></div>`
}

/**
 * The alternate, shipped as `og-image-alt.png` and named nowhere in the
 * page's metadata. The first draft of this arm carried a changed-by-the-
 * amendment chip on Annex III and a paraphrased claim, both wrong since
 * Annex III reads the same in both texts and the recording marks it
 * unchanged; this generator carries no chip and quotes rather than
 * paraphrases, so it cannot reintroduce either mistake.
 */
function armThreeHtml(
  fixture: Fixture,
  claim: Claim,
  excerpt: string,
  label: string,
): string {
  const headline = escapeHtml(cutAtWordBoundary(claim.statement, 130))
  const excerptHtml = escapeHtml(cutAtWordBoundary(excerpt, 150))
  const counts = `${fixture.retrieval.searched_ids.length} searched · ${fixture.retrieval.traversed_ids.length} traversed · ${fixture.claims.length} claims`

  return `<style>${BASE_STYLE}</style><div class="card" style="display:grid;grid-template-columns:470px 1fr"><div style="padding:64px 0 0 64px;display:flex;flex-direction:column;gap:28px">${mark(84)}<div style="font-size:54px;font-weight:700;letter-spacing:-.02em">Annex</div><div style="font-size:34px;line-height:1.28;font-weight:600">Describe an AI system. Get the articles of the EU AI Act you have to read, quoted.</div><div style="font-size:22px;color:#6e6a63">Original and amended text, cited to the provision.</div></div><div style="padding:48px 0 0 10px"><div style="background:#fff;border:2px solid #e3dfd8;border-radius:16px;padding:30px 34px;width:710px;box-shadow:0 20px 50px rgba(0,0,0,.08)"><div style="font-size:25px;line-height:1.35">${headline}</div><div style="margin-top:18px;border-left:5px solid #948d81;padding-left:20px"><b style="font-size:22px;color:#2b4c7e">${escapeHtml(label)}</b><div class="serif" style="font-size:22px;line-height:1.5;color:#4a453e;margin-top:8px">${excerptHtml}</div></div><div style="margin-top:20px;font-family:ui-monospace,Menlo,Consolas,monospace;font-size:22px;color:#6e6a63">${counts}</div></div></div></div>`
}

async function render(html: string, outPath: string): Promise<void> {
  const browser = await chromium.launch()
  try {
    const page = await browser.newPage({
      viewport: { width: 1200, height: 630 },
    })
    await page.setContent(html)
    await page.locator('.card').screenshot({ path: outPath })
  } finally {
    await browser.close()
  }
}

const fixture = loadFixture()
const { claim, excerpt, label } = findAnnexIIIPoint(fixture)

await render(
  armOneHtml(fixture, claim, excerpt),
  path.join(OUT_DIR, 'og-image.png'),
)
console.log('generated og-image.png')

await render(
  armThreeHtml(fixture, claim, excerpt, label),
  path.join(OUT_DIR, 'og-image-alt.png'),
)
console.log('generated og-image-alt.png')
