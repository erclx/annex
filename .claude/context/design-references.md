---
title: Design references
description: Reference products for placing a short claim beside long statutory text, their measured column widths and breakpoints, the patterns the answer surface takes from them, and the anti-references it avoids
---

# Design references

## Overview

The answer surface puts a one-sentence claim beside law that can run to 17 615 characters in one provision and 70 000 across a refusal. This entry records the products that already solve a version of that problem, what each does well on it, and what does not transfer. Every candidate layout for the surface cites something here. The layout itself lives in `.claude/wireframes/answer.md`, and the picks against what they beat in `.claude/ARCHITECTURE.md` under frontend scope.

Twelve products were read and six documentation sites were measured in headless Chromium at 1280 by 900 and 1536 by 864, both on 2026-09-12. Most reads went through a fetch that summarizes page text, so a claim about hover or script behavior counts as verified only where the product's own page states it. Claims that rest on a search snippet, a teardown, or markup alone are marked unverified below.

## Decisions

- **The claim keeps an excerpt and the full text moves to a docked pane.** NotebookLM, Perplexity's sources sidebar and Stripe's paired column all keep the answer visible while the source sits beside it. GitHub's "Large diffs are not rendered by default" and Gwern.net's partly collapsed long sidenotes show the other half, an excerpt that states its own length and expands on request.
- **The citation label is the provision id, never a number.** Perplexity labels its chips by publisher, and the AI Act Explorer and Cornell LII link on "Article 43" and "section 45 of this title". NotebookLM and Harvey use bare numbers, which hide exactly the information a reader of this surface needs.
- **Version sits at the passage, not only in a header.** EUR-Lex marks each amended passage `►M1` against `▼B` for base text, and the Explorer labels changed definitions "amended" and "new". The surface keeps its per-citation version chip and moved note for that reason.
- **The reading column is fixed and the pane flexes.** Next.js holds prose at 715 pixels, shadcn at 640, Radix at 730 of text and Linear at 650 to 670, and every one gives extra width to margins or a side column. Stripe and Cornell let prose widen instead, and Cornell reaches roughly 100 characters a line at 1536.
- **One collapse point, at 1024.** shadcn and Radix both drop to a single column at 1023 and below, and Next.js at 960. Below that the pane returns to an overlay rather than stacking under the answer, since stacking the whole Act under a claim recreates the full inline quotation.
- **The pane is sticky, capped at the viewport height, and scrolls inside itself.** Every measured left rail and every sticky right column does this, including Linear at 100vh minus 128 and Stripe at 100vh minus 88. Cornell's aside is the one exception, and it scrolls away with the page.
- **Their information architecture does not come with their composition.** A docs rail moves between many documents. This surface answers one question at a time, so it takes the fixed column and the sticky side column and leaves the navigation rail behind.

## Gotchas

- **Margin notes fail on this corpus.** Tufte CSS takes no step against overlap, and Gwern.net has to collapse long sidenotes. 65 of the 112 citations across the 18 recorded answers run past 1 000 characters, so a margin excerpt was dropped before rendering.
- **Scroll sync is ambiguous here.** Stripe's code column follows the prose one to one. Several claims here cite one article and one claim can cite two, so a pane that follows the claim in view would jump between provisions with no stable target.
- **Several popular claims about these products could not be confirmed.** Harvey's help center needs a login, CoCounsel's highlighted excerpts appear on no page that was readable, Perplexity's help center refused the fetch, and the Explorer's side peek is described on its index but did not appear on Article 16.

## References

### Answers over sources

- **NotebookLM**, `https://support.google.com/notebooklm/answer/16179559`. A numbered marker ends each statement, hover shows the quoted span, and a click opens the source scrolled to it. Transfers: the two layers, quote then source. Does not: a sentence-sized quote, the transcript, and markers that hide the id.
- **Harvey**, `https://www.harvey.ai/platform`, help pages unverified behind a login. A right panel lists every cited source and closes. Transfers: a closable list beside the answer for a refusal's consulted set. Does not: per-source trust apparatus over one trusted corpus.
- **CoCounsel**, `https://legal.thomsonreuters.com/en/products/cocounsel-essentials/features`. Links answers to source pages and tabulates many documents against many questions. Excerpt highlighting unverified. Weak as a visual reference.
- **Perplexity**, teardown at `https://aiuxplayground.com/teardowns/perplexity/citations/`, secondary. Labeled chips open a popover paging through sources, and a right sidebar lists them all. Transfers: the meaningful label and the sidebar. Does not: sending the reader to a new tab, and the card grid.
- **Elicit**, `https://support.elicit.com/en/articles/14759154-systematic-reviews-in-elicit`. A table of short extracted answers, with the supporting quote one click from each cell. Transfers: claim and quote as separate checkable units. Does not: a grid of many sources against one set of questions.

### Long text and its clamp

- **GitHub pull request review**, `https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/reviewing-changes-in-pull-requests/reviewing-proposed-changes-in-a-pull-request`. A comment anchors to a line range, a large diff waits behind "Load diff", and a comment on changed lines turns outdated. Transfers: the honest clamp and the outdated marker. Does not: code review chrome.
- **Gwern.net**, `https://gwern.net/design` and `https://gwern.net/sidenote`. Popups pin and enlarge to full screen, and long sidenotes collapse. Transfers: peek to reader as one escalation. Does not: hover stacks on touch, and margin placement that ranks evidence as secondary.
- **Tufte CSS**, `https://edwardtufte.github.io/tufte-css/`. Sidenotes beside the referencing line, toggled on narrow screens. Transfers: the narrow-screen toggle. Does not: anything over a few hundred characters.
- **Stripe API reference**, `https://docs.stripe.com/api`, layout from a teardown. Prose in the center, code in a sticky right column, nested fields collapsed by default. Transfers: the paired sticky column. Does not: one-to-one sync and a short right column.

### Readers of statutory text

- **AI Act Explorer**, `https://artificialintelligenceact.eu/article/3/`. One article a page, strikethrough with "amended" and "new" labels, an in-force line under each heading, and definition tooltips. Side peek unverified. Transfers: the version vocabulary and the date line. Does not: a merged redline, since this surface cites one version at a time.
- **Cornell LII**, `https://www.law.cornell.edu/uscode/text/15/6501`. Text, notes and authorities in separate tabs, and defined terms linked to a definition popup, seen in markup and not rendered. Transfers: opening one definition rather than all of Article 3. Does not: a modal that hides the claim it opened from.
- **EUR-Lex**, `https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:02024R1689-20260727`. A consolidated-version notice with dated versions, `►M1` and `▼B` provenance markers, and a "no legal effect" disclaimer. Transfers: the version model and the disclaimer. Does not: one enormous page with no scroll-to-provision.

## Measurements

| Site    | Prose at 1280 / 1536       | Characters a line    | Right column gone at | Single column at         |
| ------- | -------------------------- | -------------------- | -------------------- | ------------------------ |
| Next.js | 715 / 715, `max-width` 715 | about 70             | 1399 and below       | 960 and below            |
| shadcn  | 640 / 640, `max-width` 640 | about 78             | 1279 and below       | 1023 and below           |
| Radix   | 730 / 730 of text          | 79                   | 1439 and below       | 1023 and below           |
| Linear  | 670 / 650                  | 80 / 78              | 1048 and below       | top bar at 768 and below |
| Stripe  | 438 / 551, no cap          | 62 / 71              | never, stacks        | code stacks at 849       |
| Cornell | 643 / 750 of text, no cap  | 83 to 89 / 94 to 104 | never, moves below   | aside below at 991       |

Measured on `nextjs.org/docs/app/getting-started/layouts-and-pages`, `ui.shadcn.com/docs/components/base/data-table`, `radix-ui.com/primitives/docs/components/dialog`, `linear.app/docs/triage`, `docs.stripe.com/api/charges` and `law.cornell.edu/uscode/text/15/45`. The Next.js, shadcn and Radix line counts rest on 3 to 15 lines of short paragraphs, so they move a whole line at a time. Linear and Cornell are the reliable samples.

## Anti-references

- A centered single column under a gradient hero, named in "AI Design Slop: 16 Patterns That Out Your App as Vibe-Coded" at `https://www.developersdigest.tech/blog/ai-design-slop-and-how-to-spot-it`
- A rounded, shadowed card around every region. The only source naming it is a search snippet, so it stands on this project's own judgment
- Emoji as iconography, named in the same Developers Digest list
- A chat bubble transcript as the answer surface. No source names it
- The danger nearest this surface: a colored left-edge callout card around each claim, and a row of three cards reading applies, does not apply and unclear
