# Design

Authoring guidance: the design standard.

Every value below was read off `web/src/app/globals.css`, where the tokens land as CSS custom properties. Contrast figures quoted in this file were measured in a browser against the composited ground rather than computed from the hex pairs, at 2026-09-06.

## Personality

Annex reads like a working document rather than a chat window. The claims it makes are set in the interface's own sans and carry the weight of the page, while the Act's own words sit beside them in a serif, quieter and visibly quoted, so a reader can always tell what the regulation says from what this tool says about it. Nothing is styled to feel confident. The ground is warm paper rather than clinical white, the palette runs close to monochrome, and color is spent only where it carries meaning: amber where the amendment moved a provision, slate where the text does not settle a question, red only where the system itself failed. A reader should feel they are being shown evidence and left to judge it.

## Color

Two rows per role, since both themes ship. The dark rows are the same roles re-valued and add no role that light does not have.

There is no `success` role. The contract returns an answer, a refusal, or one of five failures, and none of those is a positive confirmation, so a green in this palette would have nothing to mark.

`rule` and `cite rule` were one token until measurement separated them. A decorative hairline carries no meaning and answers to no contrast floor. The rule marking a citation is the layout's whole grammar for "this is the evidence for the claim above it", so it answers to the 3:1 non-text floor. Sharing one value put that rule at 1.26 against its ground.

`cite rule moved` and `warning surface` are measured against each other above, which answers whether the underline marking a changed word reads against its own tint. The word itself carries no token of its own: a `<mark>` element defaults to black text, which the third-use pass's T1 finding measured at 1.36 to 1 on its tint in dark against `act`'s own 6.88 to 1 there, and it now inherits the color of the text it sits in instead, `act` or `text` depending on where it renders, rather than adding a fourth color to the palette.

| Role                 | Intent                                                                   | Value     |
| -------------------- | ------------------------------------------------------------------------ | --------- |
| background           | page canvas, the warm paper the answer sits on                           | `#FAF9F7` |
| background dark      | the same canvas inverted                                                 | `#171614` |
| surface              | top bar, trace footer, raised strips                                     | `#FFFFFF` |
| surface dark         | the same, inverted                                                       | `#1F1E1B` |
| text                 | claims, the answer's own voice                                           | `#1A1917` |
| text dark            | the same, inverted                                                       | `#EDEBE6` |
| act                  | quoted text of the Act, quieter than a claim and never equal to it       | `#4A453E` |
| act dark             | the same, held at 1.89 separation from `text dark` to match light's 1.85 | `#B3ACA0` |
| muted                | labels, captions, the trace readout                                      | `#6E6A63` |
| muted dark           | the same, inverted                                                       | `#A29D94` |
| rule                 | decorative hairline, carries no meaning on its own                       | `#E3DFD8` |
| rule dark            | the same, inverted                                                       | `#34322D` |
| cite rule            | marks a block as the Act rather than the answer, measured 3.13           | `#948D81` |
| cite rule dark       | the same, measured 3.37                                                  | `#6F6A61` |
| cite rule moved      | marks a provision the amendment moved, measured 3.27                     | `#A9853A` |
| cite rule moved dark | the same, measured 4.24                                                  | `#9A7433` |
| accent               | links and the primary action                                             | `#2B4C7E` |
| accent dark          | the same, inverted                                                       | `#8FB2E0` |
| warning              | amendment notes, the truncation banner                                   | `#8A5A00` |
| warning dark         | the same, inverted                                                       | `#E0AC55` |
| warning surface      | ground behind an amendment note or truncation banner                     | `#FBF2E0` |
| warning surface dark | the same, inverted                                                       | `#2B2317` |
| warning rule         | border on the truncation banner                                          | `#D9C49D` |
| warning rule dark    | the same, inverted                                                       | `#614C2A` |
| refusal              | the tag on a question the text does not settle                           | `#3F4A56` |
| refusal dark         | the same, inverted                                                       | `#AEBCC9` |
| refusal surface      | ground behind that tag                                                   | `#EDF1F4` |
| refusal surface dark | the same, inverted                                                       | `#1E252B` |
| refusal rule         | border on the refusal tag                                                | `#B9BFC5` |
| refusal rule dark    | the same, inverted                                                       | `#49525A` |
| error                | the failure region, and nowhere else                                     | `#8C2F26` |
| error dark           | the same, inverted                                                       | `#E89286` |
| error surface        | ground behind a failure                                                  | `#FBEEEC` |
| error surface dark   | the same, inverted                                                       | `#2C1C19` |
| error rule           | border on the failure region                                             | `#DAB5B1` |
| error rule dark      | the same, inverted                                                       | `#643F3A` |

## Typography

Three stacks carry the whole surface. The sans is the interface talking, the serif is the Act talking, and the mono is the machine reporting what it did.

The serif family is tagged because no render has confirmed it. `fc-match Georgia` on the machine this was drawn on substitutes Noto Serif, so every judgement made about the Act's voice was made against a stand-in. The hierarchy holds either way, and which serif actually ships is undecided.

The sans stack no longer carries that same tag. `fc-match` against every name in the stack below resolved to Noto Sans on the machine this was drawn on, and, measured on 2026-09-14, to DejaVu Sans on the GitHub-hosted runner this project's CI runs on. Two font files behind one shared name is what moved a wrapped line at 400 pixels and failed `web/e2e/replay.spec.ts:111` on the runner alone. `web/src/app/layout.tsx` self-hosts Noto Sans, the family this entry already named as the stand-in, so the row below does not change: `--font-sans` in `web/src/app/globals.css` reads the embedded family first and keeps the same stack after it as the fallback for the one render before the embedded font arrives. Every weight, size and line height judgement recorded here was made against Noto Sans under whichever name resolved it, so pinning that family is a correction to how it ships rather than a new decision about what it is. Measured in PR #36 on 2026-09-14.

| Role       | Family                                                            | Weight | Size   | Line height |
| ---------- | ----------------------------------------------------------------- | ------ | ------ | ----------- |
| display    | `system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`        | 600    | 26px   | 1.35        |
| heading    | `system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`        | 400    | 17px   | 1.5         |
| claim      | `system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`        | 400    | 15.5px | 1.55        |
| act        | `Georgia, "Times New Roman", Times, serif ? verify`               | 400    | 13px   | 1.5         |
| body       | `system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`        | 400    | 14px   | 1.6         |
| note label | `system-ui, -apple-system, "Segoe UI", Roboto, sans-serif` italic | 600    | 11.5px | 1.45        |
| label      | `system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`        | 400    | 10.5px | 1.4         |
| code       | `ui-monospace, Menlo, Consolas, "Liberation Mono", monospace`     | 400    | 11.5px | 1.6         |

The Family column above is a CSS value rather than a statement of intent, so the sans rows still name the fallback stack rather than the embedded family `--font-sans` now reads first. The paragraph above states which family actually renders.

A label reads in sentence case in the sans stack, with no letter spacing, per the operator's second-use pass on 2026-09-14, retiring the row's earlier mono, tracked, all-caps treatment. Every label site carries it. The last one in the retired form was the flow label in `web/src/components/recorded-picks.tsx`, drawn in capitals at 9.5px with 0.06em of letter spacing in the mono stack, and it converted with the cards that pass picked for the same file. Measured at `036dc52` on 2026-09-14, and the last site converted at this branch on the same day.

`web/evidence/settled-design.html` was the fourth round of the render-and-pick loop that chose this design, picked at `#12` on 2026-09-12 for the type scale, spacing and treatments a wireframe and a token table now describe in words. It carried the retired label treatment as its single most repeated declaration: 9 sites in the mono family, 7 of them `text-transform:uppercase` and 4 of them `letter-spacing:.08em`. It was authoritative for that one round, and the first-use and both second-use passes since have moved past what it still showed as current. `.claude/rules/project/ui/900-surface-evidence.md` no longer names it as a source. Measured at this branch on 2026-09-14.

## Spacing

Base unit 8px.

| Step | Multiplier | Value |
| ---- | ---------- | ----- |
| xs   | 0.5        | 4px   |
| sm   | 1          | 8px   |
| md   | 2          | 16px  |
| lg   | 3          | 24px  |
| xl   | 5          | 40px  |

## Borders

| Role     | Radius | Width | When used                                          |
| -------- | ------ | ----- | -------------------------------------------------- |
| default  | 8px    | 1px   | the app frame, banners, the failure region, inputs |
| pill     | 999px  | 1px   | status chips and the refusal tag                   |
| citation | 0      | 2px   | left edge only, marking a quoted provision         |
| none     | 0      | 0     | edge-to-edge surfaces                              |

## Layout

Picked by looking against real content, and `canon/context/design-references.md` holds the measured sites each rule answers to.

- The answer column opens at a reading measure of 640px. A reader sets it anywhere from 480px to 760px from the handle between the columns, the width is remembered, and it never follows the viewport
- The pane beside it takes the remaining width, with a floor of 420px
- One breakpoint, at 1024px. Below it the page is a single column and the pane opens as an overlay
- The top bar pins to the top of the viewport at one full height in every state
- The pane stays in view under the pinned bar, fills the height left below it, and scrolls inside itself
- On `/ask`, content starts from the page's left gutter under a full-width top bar, with no centered container
- On `/`, the landing page centers its heading, supporting text and composer on a 760px measure at 1024px and wider, with the composer at 640px and the heading at 34px, and holds the recorded questions to a centered 1080px measure inside the gutter. Below 1024px it keeps the left gutter and the 26px heading. `/evaluation` holds the terms, the pipeline rail and the three-arm comparison the landing page carried until T6 Pick 5 moved them, to the same centered 1080px measure

The column range and the pinned bar were picked by looking in the operator's first-use pass, recorded in `canon/ARCHITECTURE.md` under frontend scope, against a fixed split, a split with preset widths, and a single toggle between two widths. The same pass had the bar slim once the described system scrolled under it, and the operator's second-use pass reversed that to the full bar. The same second pass split the one page into `/` and `/ask`, N1 arm 2, which is why the no-centered-container rule now holds on `/ask` alone.

## Motion

Motion carries information on this surface or it does not happen, and only the wait for an answer moves. Three things move there. The running step's dot throws a ring outward every 1.2 seconds, the walk grows over about two seconds as the stream reports what search and traversal reached, and from two seconds into drafting a card steps through the provisions the model was supplied, one every 3.5 seconds. Nothing else animates, transitions a layout, or eases a scroll, and under `prefers-reduced-motion` the dot stops and the walk arrives whole.

The rule this replaces was a static skeleton with a stated duration, on the argument that a number tells a reader more than a spinner does. That argument still holds, and the wait keeps the numbers: each step states how long it ran, measured in the browser as its frame arrived, and what it reached. The dot marks which of those numbers is still counting rather than standing in for one. The narrowing of 2026-09-12 already admitted a traversal readout that draws itself, and the first-use pass on 2026-09-13 picked the dot and the card as well, so this section now names all three rather than leaving the two newer ones outside its wording.

The replay build plays the same steps at an invented pace, and it says so in visible text beside them. Motion that reports a timing nobody measured is the one thing this section forbids outright.

Hover, focus, and toggle transitions stay governed by `.claude/rules/canon/ui/430-ux-completeness.md`, and that includes the fade that dims the rest of the walk while one chip's path is traced.

## Iconography

Icons are welcome where one carries meaning a word carries worse. Draw them inline in the component that uses them and let them take their color from `currentColor`, so a mark follows the tokens the way every other element does. The theme control is three of them, a monitor, a sun and a moon, because the choice is between two appearances and a deferral, which words describe more slowly than shapes show.

What this rules out is a dependency rather than a drawing. The version toggle stays a segmented control of two text labels, the traversal switch stays a drawn shape, and the trace disclosure stays a text triangle, because a word or a shape is the better mark in each of those. Reaching for an icon library is the decision worth recording here first, and it becomes worth considering only once a set has outgrown drawing it inline. `canon/wireframes/answer.md` carries the version toggle's and the traversal switch's own geometry, so a reader who lands on either kind named here first is not left thinking this sentence is the whole description. The trace disclosure needs nothing past the word already given it here. The wireframe separately describes the trace's id-list grid, a control this paragraph names no kind for.

This section read as a flat ban until 2026-09-06. The reason it gave was the dependency, that one icon invites a set and the set is a dependency this surface has no need of, and that reason survives here intact. What changed is that the ban was doing more work than its reason supported: an inline path carrying no package satisfies the argument completely, and refusing it cost a round trip for every mark.

Re-measured at this branch on 2026-09-12: `web/src/components/theme-toggle.tsx` is the only file drawing icons, three inline paths for monitor, sun and moon, and `web/package.json` still carries no icon library. Nothing shipped since 2026-09-06 adds a fourth mark. The conclusion does not move. It now stands on a count rather than an assumption.

## Mark

The scaffold shipped a stock favicon and five unused sample SVGs, two of them naming other companies on a page presented as this project's own work. Neither was drawn for this project, and the requirement is that a forwarded link introduce it rather than render as a bare URL.

The mark was picked by looking, not argued into place. Four arms went through `canon:draft-identity`'s render-and-pick loop, each a different shape holding the card's type and layout fixed: a stylized paragraph mark, a vertical citation-rule tab reusing the app's own `cite rule` token, a small reference graph of three nodes and two edges, and an "A" built from two facing article brackets. The operator picked the reference graph on 2026-09-12, against its own stated cost, that a node-and-edge glyph reads close to a generic network icon unless the weight is held tight.

The pick ties to the one place this corpus visibly does more than search: the graph in `canon/ARCHITECTURE.md` walks the Act's own cross-references outward from a semantic-search start, and the mark draws that walk as three points and two edges, the third node in `accent` to echo the citation and link color rather than reading as a plain diagram.

Construction: `ink` (`#1A1917`) strokes and fills, `accent` (`#2B4C7E`) on one node only, transparent ground, drawn at a 100-unit viewBox so the same path scales from a 16px favicon to the 512px icon and the 96px chip on the social card. `web/public/favicon.svg` is the vector source, and `metadata.icons` lists it ahead of every raster size, so a browser that reads SVG favicons never touches the rest of the set. `web/public/icon-32x32.png` through `icon-512x512.png` and `web/public/og-image.png` are rendered from it via `canon capture`, at the stroke weight the icon set uses (6, heavier than the card's own 4) so the shape survives being small.

`icon-16x16.png` is not rendered the same way. `canon capture` painted nothing at that element size, confirmed against a plain filled rectangle carrying no mark geometry at all, so the gap is the tool's own floor on a captured element this small rather than a property of this shape. That file is downsampled instead, from the 512px render with a high-quality resize filter, which is what actually ships. `web/src/app/layout.tsx` wires the set into `metadata.icons`, `metadata.openGraph`, and `metadata.twitter` rather than relying on the `favicon.ico` file-name convention, so the file itself was removed along with the five unused scaffold SVGs, confirmed unimported before deletion.

`web/src/components/brand-mark.tsx` is the second place this geometry lives, drawn inline for the header rather than served as a static file, and it is the source: `web/public/favicon.svg` carries the same three edges and four nodes on the same 100-unit viewBox, and `web/src/components/brand-mark.test.tsx` compares the two on every run, so a change to one geometry fails until the other follows. The header mark takes `currentColor` for the ink and the theme's accent token for the one accented node, the way every other element on this surface does, so it never needs the fix below. The favicon cannot: a browser loads it before any stylesheet runs, so it hardcodes both colors, and a change to a design token has to be hand-carried into the static file. The geometry test alone would pass through that drift silently, since it never reads a color, so `brand-mark.test.tsx` also parses the `ink` and `accent` tokens straight out of `globals.css`, light and dark, and asserts the favicon's hardcoded hex values against them.

That hardcoding is what the operator's first-use pass measured as broken on 2026-09-13, picking O1 arm 1 over the mark unchanged, a light tile behind it everywhere, and a tile matching the browser theme, both of which cost the mark a fifth of its size at 16px. Against Chrome's dark tab colors the ink read 1.46:1 and 1.09:1, and only the mark's three light-filled circles survived, reading as scattered dots with no lines joining them. `favicon.svg` now carries a `prefers-color-scheme: dark` block swapping the ink lines and the center node to `text dark` (`#EDEBE6`) and the accent ring to `accent dark` (`#8FB2E0`), keeping the mark's shape and size unchanged. That swap follows the browser or system theme, not the page's own toggle, since the file is served before the toggle's script runs. The PNG sizes cannot follow either theme, since a raster image carries no media query, so a browser that loads a PNG over the SVG favicon still shows the light-theme mark. That gap was accepted with the pick rather than closed, since nothing short of serving a different file per theme would close it, and no browser observed here prefers the PNG over the SVG.

The pipeline figure that once sat under the three-arm comparison carried a defect of the same shape as O1, measured rather than argued: `web/src/components/pipeline-diagram.tsx` sized its type in SVG viewBox units and scaled the whole figure to the pane's width, so every pixel of width the pane lost shrank the type with it, down to 7.1px at 1280. The rebuilt figure is a vertical rail, one stage a row at full size, matching the layout the operator picked over a plain list (283px tall) and two wrapped rows (259px, whose bend read awkwardly), and the clean line style picked over the same rail with roughened strokes and over sketched cards with the switchable stages hatched and a curly brace, both picks decided by the operator's first-use pass on 2026-09-13 as O4. Retrieve and Traverse are the two stages the three-arm comparison switches on and off, so their dots draw solid in the accent color against the other three stages' hollow ink-bordered dots, the bracket and its caption read in the accent color too, and the caption that used to sit under the whole figure now reads off that bracket, all read directly off the picked render rather than off its prose summary. Every label and caption is plain HTML text at a fixed pixel size rather than an SVG unit that scales with the viewBox, so it holds an 11px floor at both 1280 and 400, measured off the built page rather than judged by eye. Every stroke and fill reads from the theme, through the theme tokens or `currentColor` the way `walk-chips.tsx` does, so both themes render from the one source.

The social card is the third mark this section covers, and the hold this entry once carried is over. Pick 15 chose arm 1: the mark and name, the recorded CV-screening description in quotation marks, its claim quoted exactly and cut at a word boundary, and the Annex III point 4(a) excerpt the claim rests on, smallest text at 26px, 13px at half size. `web/scripts/generate-social-card.ts` renders that arm from `web/src/fixtures/q04-cv-screening.consolidated.json` at build time, quoting rather than typing, so a re-capture that changes the claim changes the card the next time the script runs, and it renders arm 3 alongside it as `web/public/og-image-alt.png`, an alternate named nowhere in the page's metadata. `feature-corpus-and-answer-text` merged as `#28`, so `bun run generate:social-card` ran for real against the re-captured fixture: the claim still names Annex III point 4(a), still cites `anx_III`, and the citation still reads `changed: false`, so both cards render the arms the pick chose rather than a placeholder. `web/public/og-image.png` and `web/public/og-image-alt.png` are both committed, at 1200 by 630 and roughly 82 and 88 kilobytes, and `web/e2e/metadata.spec.ts` asserts both resolve over HTTP with a non-zero body. Arm 3's panel originally ran 40px past the canvas edge, the width of its right cell carried over as it stood in the operator's picked render, clipping the excerpt against the frame rather than at its own ellipsis. `armThreeHtml` narrows that panel from 760px to 710px, which keeps it inside the 1200px canvas with room to spare. `web/src/app/layout.tsx` still points every consumer at `og-image.png` alone. Nothing automatic keeps either card in step with the next re-capture, and a fixture change that breaks one of the generator's three preconditions fails its own throw rather than the build.
