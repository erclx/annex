# Design

Authoring guidance: the design standard.

Every value below was read off `web/src/app/globals.css`, where the tokens land as CSS custom properties. Contrast figures quoted in this file were measured in a browser against the composited ground rather than computed from the hex pairs, at 2026-09-06.

## Personality

Annex reads like a working document rather than a chat window. The claims it makes are set in the interface's own sans and carry the weight of the page, while the Act's own words sit beside them in a serif, quieter and visibly quoted, so a reader can always tell what the regulation says from what this tool says about it. Nothing is styled to feel confident. The ground is warm paper rather than clinical white, the palette runs close to monochrome, and color is spent only where it carries meaning: amber where the amendment moved a provision, slate where the text does not settle a question, red only where the system itself failed. A reader should feel they are being shown evidence and left to judge it.

## Color

Two rows per role, since both themes ship. The dark rows are the same roles re-valued and add no role that light does not have.

There is no `success` role. The contract returns an answer, a refusal, or one of five failures, and none of those is a positive confirmation, so a green in this palette would have nothing to mark.

`rule` and `cite rule` were one token until measurement separated them. A decorative hairline carries no meaning and answers to no contrast floor. The rule marking a citation is the layout's whole grammar for "this is the evidence for the claim above it", so it answers to the 3:1 non-text floor. Sharing one value put that rule at 1.26 against its ground.

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
| refusal              | the tag on a question the text does not settle                           | `#3F4A56` |
| refusal dark         | the same, inverted                                                       | `#AEBCC9` |
| refusal surface      | ground behind that tag                                                   | `#EDF1F4` |
| refusal surface dark | the same, inverted                                                       | `#1E252B` |
| error                | the failure region, and nowhere else                                     | `#8C2F26` |
| error dark           | the same, inverted                                                       | `#E89286` |
| error surface        | ground behind a failure                                                  | `#FBEEEC` |
| error surface dark   | the same, inverted                                                       | `#2C1C19` |

## Typography

Three stacks carry the whole surface. The sans is the interface talking, the serif is the Act talking, and the mono is the machine reporting what it did.

The serif family is tagged because no render has confirmed it. `fc-match Georgia` on the machine this was drawn on substitutes Noto Serif, so every judgement made about the Act's voice was made against a stand-in. The hierarchy holds either way, and which serif actually ships is undecided.

| Role       | Family                                                            | Weight | Size   | Line height |
| ---------- | ----------------------------------------------------------------- | ------ | ------ | ----------- |
| display    | `system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`        | 600    | 26px   | 1.35        |
| heading    | `system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`        | 400    | 17px   | 1.5         |
| claim      | `system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`        | 400    | 15.5px | 1.55        |
| act        | `Georgia, "Times New Roman", Times, serif ? verify`               | 400    | 13px   | 1.5         |
| body       | `system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`        | 400    | 14px   | 1.6         |
| note label | `system-ui, -apple-system, "Segoe UI", Roboto, sans-serif` italic | 600    | 11.5px | 1.45        |
| label      | `ui-monospace, Menlo, Consolas, "Liberation Mono", monospace`     | 400    | 10.5px | 1.4         |
| code       | `ui-monospace, Menlo, Consolas, "Liberation Mono", monospace`     | 400    | 11.5px | 1.6         |

Labels set in the mono stack are drawn in capitals with letter spacing near 0.08em. That treatment belongs to labels and to nothing else on the surface.

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

## Motion

No motion. Nothing on this surface animates, transitions, or eases. The one moment that would justify it is the wait for an answer, and that is drawn as a static skeleton with a stated duration rather than as a spinner, because a number tells a reader more than movement does.

This section read as a ban on all motion until 2026-09-12. The reason it gave was never that broad: it argues against a spinner, against motion standing in for information the interface could state plainly instead, and the skeleton-over-spinner reasoning above is that argument in full. It says nothing against motion that carries the information itself, such as a traversal readout that draws itself as each hop resolves, where the drawing is the state changing rather than a stand-in for an unknown wait. That narrower reading is what this section now states, and it reaches only a readout of that shape. Hover, focus, and toggle transitions are untouched and stay governed by `.claude/rules/canon/ui/430-ux-completeness.md`.

## Iconography

Icons are welcome where one carries meaning a word carries worse. Draw them inline in the component that uses them and let them take their color from `currentColor`, so a mark follows the tokens the way every other element does. The theme control is three of them, a monitor, a sun and a moon, because the choice is between two appearances and a deferral, which words describe more slowly than shapes show.

What this rules out is a dependency rather than a drawing. The version toggle stays a segmented control of two text labels, the traversal switch stays a drawn shape, and the trace disclosure stays a text triangle, because a word or a shape is the better mark in each of those. Reaching for an icon library is the decision worth recording here first, and it becomes worth considering only once a set has outgrown drawing it inline.

This section read as a flat ban until 2026-09-06. The reason it gave was the dependency, that one icon invites a set and the set is a dependency this surface has no need of, and that reason survives here intact. What changed is that the ban was doing more work than its reason supported: an inline path carrying no package satisfies the argument completely, and refusing it cost a round trip for every mark.

Re-measured at this branch on 2026-09-12: `web/src/components/theme-toggle.tsx` is the only file drawing icons, three inline paths for monitor, sun and moon, and `web/package.json` still carries no icon library. Nothing shipped since 2026-09-06 adds a fourth mark. The conclusion does not move. It now stands on a count rather than an assumption.
