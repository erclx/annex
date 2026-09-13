---
title: Answer
description: The single surface where a described system becomes a list of articles to read, or a refusal
---

# Answer

One surface carries the whole product. A visitor describes a system, and the same page becomes the answer, the refusal, or the failure. There is no navigation and no second screen.

At 1024 pixels and wider the screen holds two regions side by side. The answer column on the left keeps a fixed reading measure near 640 pixels, and the pane on the right takes the rest, stays in view as the page scrolls, and scrolls inside itself. Below 1024 the page is one column and the pane opens as an overlay instead.

The shape was picked by looking, over three rounds of candidates rendered against recorded answers at their real size and at 1280, 1536 and 400 pixels wide. `canon/context/design-references.md` holds the products each candidate answered to, and `canon/ARCHITECTURE.md` records each pick against what it beat. A claim keeps its evidence directly under it, which is the property the first layout comparison chose inline citations for. What it no longer does is print the law whole: 65 of the 112 citations in the recording run past 1 000 characters, and printing them put the first recorded answer's second claim 2 836 pixels down the page at 1280.

## The replay band

Rendered under the top bar in every state, and only on the deployed build. A local build calling the service never shows it.

```plaintext
├──────────────────────────────────────────────────────────────────────┤
│ This page replays a recording. Nothing here is asking a model.       │
│ Every answer below came back from the live system on 2026-09-07 and  │
│ was captured as it stood.                             2c74d20        │
├──────────────────────────────────────────────────────────────────────┤
```

Copy, verbatim:

- `This page replays a recording. Nothing here is asking a model.`
- `Every answer below came back from the live system on <date> and was captured as it stood.`

The date and the short commit are read off the capture manifest rather than written here, so a re-capture moves them and a stale recording cannot claim to be fresh.

The band is on the page rather than in a footnote because the claim a visitor would otherwise carry away is that they watched a model answer. They did not. The model this project runs holds 30 GB of a card, nothing hosted answers these questions, and what a deployment can honestly serve is what the live system already said.

The traversal switch is held inactive on this build, and the line under it reads `Recorded with traversal on`. Capture ran with reference following on, so both positions would return one answer and a live switch would lie about it. Beside it the version control is untouched, since both texts were captured and comparing them is what the deployed page is for.

Below 1024 the band shortens to one line, so the question starts near the top of a phone screen. The line still says the page is a recording, and the date and commit sit behind a details control.

```plaintext
├──────────────────────────────┤
│ A recording, not a live      │
│ model.  Details              │ ← opens the date and commit
├──────────────────────────────┤
```

Copy, verbatim, below 1024:

- `A recording, not a live model.`
- Details control: `Details`

## Empty, at 1024 and wider

Reached on arrival, before anything is asked. The top bar and the band run the full width, and everything under them starts from the same left edge rather than centering in a narrow container.

```plaintext
┌──────────────────────────────────────────────────────────────────────┐
│ ◆ Annex Which articles of the EU AI Act…  Repository  Evaluation     │
│                        [ Original |*Amended 27 Jul 2026*]  (•) …    │ ← top bar, pinned
├──────────────────────────────────────────────────────────────────────┤
│ Describe what you are building.   │ BEFORE YOU ASK        ← pane    │
│ You get back the articles you     │                                  │
│ have to read.          ← display  │ TERMS USED ON THIS PAGE          │
│                                   │ Provision      An addressable…   │
│ Plain language is enough. Annex   │ High risk      A classification… │
│ reports which provisions apply…   │ …seven terms in all              │
│                                   │                                  │
│ ┌───────────────────────────────┐ │ ┌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌┐ │
│ │ A customer-service chatbot…   │ │ ╎ the three-arm comparison     ╎ │
│ └───────────────────────────────┘ │ ╎ region, reserved   ← held    ╎ │
│ [ Find the articles ]             │ └╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌┘ │
│ ───────────────────────────────── │                                  │
│ Or read one of the recorded       │                                  │
│ questions                         │                                  │
│ TELLING A PERSON THEY ARE…        │                                  │
│ a chatbot on our website that…    │                                  │
│ a voice agent that phones our…    │                                  │
│ …four groups, three questions each│                                  │
│                                   │                                  │
│   ← answer column, fixed measure  │   ← pane, takes the rest         │
└──────────────────────────────────────────────────────────────────────┘
```

Copy, verbatim:

- Product name: `Annex`, with the project mark drawn before it
- Tagline: `Which articles of the EU AI Act you have to read`
- Top bar links: `Repository`, `Evaluation`
- Traversal hint on the local build: `Turn off to compare against search alone`
- Traversal hint on the deployed build: `Recorded with traversal on`
- Display: `Describe what you are building. You get back the articles you have to read.`
- Supporting text: `Plain language is enough. Annex reports which provisions apply and quotes them, against your choice of the original text or the text as amended on 27 July 2026. Every claim carries the article text it came from, so you check the answer rather than trust it. It does not tell you whether you comply.`
- Input placeholder: `A customer-service chatbot that also scores loan applications…`
- Action: `Find the articles`
- Pane label: `Before you ask`

The last sentence of that supporting text is doing compliance work rather than tone work. No label, heading, or button anywhere on this surface may imply a verdict on whether an organization complies, and the empty state states that boundary before a visitor has asked anything.

The top bar carries `Repository` and `Evaluation` in every state rather than on the empty state alone. A visitor who reaches an answer or a refusal, the moment likeliest to prompt checking the source, can still reach them without editing back to a blank form. They drop out while the bar is slim, and return once the page is scrolled back to the top.

The pane holds context beside the question before it holds the Act. Three other contents were rendered and lost: no pane at all until something is asked, the Act open at Article 3, and a recorded answer previewed. `canon/ARCHITECTURE.md` carries what each cost.

## Empty, below 1024

```plaintext
┌──────────────────────────────┐
│ ◆ Annex              [theme] │ ← bar holds the brand
├──────────────────────────────┤
│ Describe what you are        │
│ building. You get back the   │
│ articles you have to read.   │
│                              │
│ Plain language is enough…    │
│ ┌──────────────────────────┐ │
│ │ A customer-service…      │ │
│ └──────────────────────────┘ │
│ [ Original |*Amended*]       │ ← the choices, under
│ (•) Reference traversal      │   the description
│ [ Find the articles ]        │
│ ──────────────────────────── │
│ Or read one of the recorded  │
│ questions                    │
│ …                            │
│ TERMS USED ON THIS PAGE      │ ← the pane's content,
│ …                            │   under the picks
│ THE THREE-ARM COMPARISON     │
│ Arm | Text | Recall | …      │
│ [ pipeline diagram ]         │
└──────────────────────────────┘
```

Nothing the pane holds is lost at this width. The terms and the comparison follow the recorded picks in the one column.

### The recorded picks

Rendered under the form on both builds, so the build that can answer anything stops being the one with no route into itself. Each question is one row of plain text under its flow label, separated by a hairline rather than boxed.

Copy, verbatim:

- Heading: `Or read one of the recorded questions`
- Supporting text: `These are the twelve descriptions the live system was asked, against both texts. Anything else reaches a state saying the recording does not hold it.`
- Flow labels: `Telling a person they are dealing with an AI system`, `Whether a system is high risk, and what follows`, `Changing a system already on the market`, `When an obligation starts to apply`

The picks sit beside the input rather than in place of it. Narrowing the input to a picker would remove the unrecorded state below and change the surface the design was settled on, and the free-text field is what a visitor arrives expecting.

The four flow labels are the evaluation's own grouping, three questions apiece. The fifth demo flow, the three-arm result, is not a question a visitor asks. It renders below as the comparison rather than as a fifth pick.

### The terms strip

Gathers the seven load-bearing terms that appear unglossed elsewhere on this surface: `provisions`, the `Original` / `Amended 27 Jul 2026` pair, `Reference traversal`, `high risk`, `general-purpose AI model`, `prohibited practice`, and the bare commit hash. Term and definition sit side by side under the label `Terms used on this page`.

An inline hover definition was drafted and rejected by looking. It is a second overlay on a surface whose only overlay is the pane below 1024, and a gathered strip needs no hover state, so it carries every definition at once.

### The three-arm comparison

A labelled region under the terms, holding the argument for measuring retrieval against a full-context baseline at all, the table itself, its caveats, and the pipeline diagram. Generated from `python/data/eval/results.json` through the `evaluation-summary.json` fixture rather than transcribed, so the table moves when the next `evaluate` run does.

Heading, verbatim: `The three-arm comparison`

The table carries one row per arm and text: the arm's label, which text it ran against, recall, faithfulness, nodes supplied, and correct refusals over the questions the text does not settle. Recall, faithfulness, precision and cost read as the stable half of the evaluation, and the table treats them as facts. Refusal is carried the same way but captioned rather than trusted: three questions per arm and text is too few to rank the arms on, and the caption under the table says so rather than letting the fraction imply more than it can support.

Below the table, one line names the hardware and the model each arm ran on, and one paragraph explains why the comparison exists: the Act fits inside a current context window, so a model can read the whole document and answer from it, which makes retrieval something to justify rather than assume.

The pipeline diagram sits last: the five stages a request passes through, intake through verify, so a reader sees where retrieval and traversal sit inside one answer rather than reading the table as the only picture of what the system does.

## Invalid

Reached when a submit is tried on a description that is empty or past the service's 4 000 character bound. The service never started work, so this never renders in the failure region. Leaving the box without submitting raises nothing, and the message clears as soon as the description is valid again.

```plaintext
│   ┌──────────────────────────────────────────────┐                   │
│   │                                              │   ← input, in its  │
│   └──────────────────────────────────────────────┘      error edge   │
│   A description is needed before this can be answered.               │
│                                                                      │
│   [ Find the articles ]                              ← held inactive  │
```

Copy, verbatim:

- Empty: `A description is needed before this can be answered.`
- Past the bound: `The description is too long, so shorten it to 4 000 characters or fewer.`

The form checks the length itself before asking. The service's own `invalid` answer carries no reason a reader can act on, and one sentence covering both cases read as "a description is needed" under a box visibly full of text.

## Loading

```plaintext
├──────────────────────────────────────────────────────────────────────┤
│ THE SYSTEM YOU DESCRIBED                                             │
│ A customer-service chatbot for a Swedish retail bank that also…      │
├──────────────────────────────────────────────────────────────────────┤
│   ▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁                              │
│   ▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁                              ← claim-shaped   │
│                                                                      │
│   ▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁                      ← citation-shaped│
│   ▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁                                             │
│                                                                      │
│   • Reading the amended text. Usually around 20 to 30 seconds.       │
└──────────────────────────────────────────────────────────────────────┘
```

Copy, verbatim: `Reading the amended text. Usually around 20 to 30 seconds.` The version named in that sentence is dynamic and follows the toggle.

The skeleton takes the shape of the answer rather than of generic bars, so the wait previews the result. The stated range is drawn from measured warm runs and belongs in the copy, because a number tells a reader more than a spinner does. At 1024 and wider the skeleton fills the answer column and the pane keeps what it held before the question was asked.

## Answered, at 1024 and wider

The plain case. No provision moved, nothing cut.

```plaintext
┌──────────────────────────────────────────────────────────────────────┐
│ Annex  Which articles of the EU AI Act…   Repository  Evaluation     │
│                        [ Original |*Amended 27 Jul 2026*]  (•) …    │
├──────────────────────────────────────────────────────────────────────┤
│ THE SYSTEM YOU DESCRIBED                                             │
│ A customer-service chatbot for a Swedish retail bank…                │
│ Edit description                                                     │
├───────────────────────────────────┬──────────────────────────────────┤
│ The chatbot has to tell the       │ [*The Act*| The walk ]  [Orig|*Am│ ← pane header
│ person they are interacting with  │ CITED IN THIS ANSWER             │
│ an AI system.        ← claim      │ *Article 50(1)*  Article 50(6)   │ ← jumps the pane
│                                   ├──────────────────────────────────┤
│                                   │ ‹ Article 50   51 of 133  Go to ›│ ← section bar
│                                   ├──────────────────────────────────┤
│  │ Article 50(1)  AMENDED         │ ░ Article 50  Transparency…    ░ │
│  │ Providers shall ensure that AI │ ░ 1. Providers shall ensure    ░ │ ← scrolled to,
│  │ systems intended to interact   │ ░ that AI systems intended to  ░ │   held in a tint
│  │ directly with natural persons  │ ░ interact directly with…      ░ │
│  │ are designed and developed in… │   2. Providers of AI systems,    │
│  │ Read all 702 characters… →     │   including general-purpose…     │
│                                   │                                  │
│ The disclosure obligation does    │   3. Deployers of an emotion     │
│ not apply where it is obvious…    │   recognition system…            │
│                                   │                                  │
│  │ Article 50(6)  AMENDED         │                   ← the whole    │
│  │ Paragraphs 1 to 4 shall not…   │                     Act, scrolls │
│  │ Read all 227 characters… →     │                     inside itself│
│ ───────────────────────────────── │                                  │
│ qwen3.8:27b  7 940 prompt  288…   │                                  │
│ 8 searched · 11 traversed · 0     │                                  │
│ dropped → walk in pane  ← trace   │                                  │
└───────────────────────────────────┴──────────────────────────────────┘
```

A claim is set in the interface's own voice and a quoted provision in a serif behind a left rule, so the two are never mistaken for each other. Every claim carries at least one citation. A claim that reached the surface with none is a contract violation rather than a layout case.

The excerpt under a claim shows at most six lines of the provision and always ends in `Read all <n> characters in the Act →`. The handle names the length whether or not the clamp cut the quote, since whether six lines hold a provision depends on the width the column renders at, and a handle that named the length only when it guessed a cut would sometimes sit under a cut quote reading as whole. Activating that line or the citation's heading scrolls the pane to the provision.

A long provision rarely rests a claim on its first six lines, so the excerpt opens on the closest point. Each cited provision is cut at its own paragraphs, definitions and points, and the passage sharing the most words of four letters or more with the claim wins once it shares at least 8. The heading then names that passage, such as `Article 79(8)` or `Annex III, point 4(a)`, the excerpt opens on it behind an ellipsis, and the heading and the handle both land the Act there. Where no passage reaches 8, the excerpt stays at the top and says no single passage wins. A provision with fewer than two numbered passages carries no label at all, since there is nothing to choose between.

The label says closest and never quoted. The rule is lexical, its threshold was fitted by looking at three cases, and nothing records which passage the model read the claim from. The operator's first-use pass picked it over the first six lines and over the same landing left unnamed.

The pane opens on the first provision the answer cites. Its list of cited provisions carries every citation in the answer once, in the order the claims first cite them, and marks the one the pane is showing.

Copy, verbatim:

- Excerpt landing label: `closest point`
- Excerpt label when no passage wins: `whole provision, no single passage wins`
- Pane views: `The Act`, `The walk`
- Cited list label: `Cited in this answer`
- Excerpt handle: `Read all <n> characters in the Act →`, where `<n>` is the provision's own length
- Column handle, the divider between the answer and the pane: `Resize the answer and the Act`
- Section bar steps: `Previous section`, `Next section`, and `Previous cited provision`, `Next cited provision` once switched to citations
- Section bar switch: `Whole Act`, `Cited`
- Section bar jump field placeholder: `Go to`
- Section bar position, dynamic: `<n> of <total>` through the whole Act, `<n> of <total> cited` through citations

The divider between the answer and the pane is a handle. Dragging it, or stepping it with the arrow keys, sets the answer column anywhere from 480 to 760 pixels, and a double-click or Enter puts it back at 640. It remembers.

The section bar sits over the Act's text. It names the article or cited paragraph in view with its place in the whole, steps to the section before or after it or, once switched to `Cited`, to the citation before or after, and takes an article number or annex numeral in its jump field. The operator's first-use pass picked it over the cited links alone, step buttons in the cited row, and the bar without a jump field or the switch.

## Answered, below 1024

```plaintext
┌──────────────────────────────┐
│ THE SYSTEM YOU DESCRIBED     │
│ A customer-service chatbot…  │
├──────────────────────────────┤
│ The chatbot has to tell the  │
│ person they are interacting  │
│ with an AI system.           │
│                              │
│  │ Article 50(1)  AMENDED    │
│  │ Providers shall ensure    │
│  │ that AI systems intended… │
│  │ Read all 702 characters…  │ ← opens the overlay
│                              │
│ ──────────────────────────── │
│ qwen3.8:27b  7 940 prompt…   │
│ 8 searched · 11 traversed ▾  │ ← expands in place
└──────────────────────────────┘
```

The excerpt keeps its six-line clamp at this width. Its handle opens the Act as an overlay rather than scrolling a pane.

## Answered, with a moved citation

Rendered on top of the answered state whenever a cited provision was moved by the amendment.

```plaintext
│ A system used to evaluate the creditworthiness of natural persons    │
│ is high-risk, and the human underwriter at the end does not remove   │
│ that classification.                                                 │
│                                                                      │
│  ┃ Annex III(5)(b)  ( moved by the amendment )      ← rule and chip   │
│  ┃ AI systems intended to be used to evaluate the      both marked    │
│  ┃ creditworthiness of natural persons or…          ← the Act,        │
│  ┃ ──────────────────────────────────────────         clamped         │
│  ┃ Not the Act's words: Regulation (EU) 2026/1744   ← our note about  │
│  ┃ moved the date this bites. Read against the         the Act, never │
│  ┃ original text it was 2 August 2026.                 the Act itself │
│  ┃ Read all 7 350 characters in the Act →                             │
```

Copy, verbatim:

- Chip: `moved by the amendment`
- Note label: `Not the Act's words:`
- Note body is dynamic, supplied per citation.

Three layers appear inside one block and a reader has to be able to separate them without effort: the claim, the Act's own words, and our note about the Act. The note is the layer a reader is likeliest to mistake for statute, so it is fenced off by a rule and named outright rather than introduced by a neutral heading. The label is blunt on purpose.

The clamp reaches only the Act's words. A note always renders whole, since it is the one thing the amendment adds to a citation.

### The word diff

Read as a word diff between the two exported corpora, so a rewrapped sentence with no wording change reads as unchanged. The words the shown version adds that the other version does not share are tinted the same ground the note stands on, `warning-surface`, and carry a `cite-rule-moved` underline, so the highlight reads as a second weight on the Act's own words rather than a fourth color competing with the claim and the note. The tint alone measured 1.057 to 1 against paper in light and 1.167 to 1 in dark, imperceptible rather than a second weight, and the underline is what a reader actually sees: `cite-rule-moved` against `warning-surface` measures 3.09 to 1 in light and 3.63 to 1 in dark, both past the 3 to 1 floor a non-text mark is held to.

```plaintext
│  ┃ Article 95(4)  ( moved by the amendment )    Read the original text  │
│  ┃ The AI Office and the Member States shall take into account the      │
│  ┃ specific interests and needs of SMEs, including start-ups, ▒and      │
│  ┃ SMCs,▒ when encouraging and facilitating the drawing up of codes     │
│  ┃ of conduct.                                                          │
```

Copy, verbatim: `Read <the other version's label>`, reading the text a reader would switch to rather than the one already on screen. `the original text` and `the amended text` are the same two phrases `canon/context/ai-act.md` names for the two texts.

Activating the control swaps the excerpt for the other version's whole text, still clamped to the block's line limit, and swaps the control's own label to the version now on screen. It marks the words that version adds and the shown version does not share, which is how a removal reaches the reader: never as struck-through words inside the version on screen, since that would put words on the page the Act does not carry there, but as the highlight on the other version once the control is activated. The landing, the heading and the handle stay pinned to the version the citation shipped with. Only the excerpt and the control's own label move.

The same highlight lands on the provision the pane opens: activating the heading or the handle still opens the Act to the citation's own version, and every word that version's own diff marks reads under the same tint there, bounded to the one section the citation opened rather than computed across the whole Act.

### A provision the amendment added or removed

Rendered when the cited provision exists in only one of the two texts, which a word diff has nothing to compare against.

```plaintext
│  ┃ Article 111(4)  ( added by the amendment )                          │
│  ┃ Providers of high-risk AI systems already placed on the market      │
│  ┃ shall inform the deployer without undue delay.                      │
```

Copy, verbatim: `added by the amendment` in place of `moved by the amendment` where the provision exists in the amended text alone, `removed by the amendment` where it exists in the original alone. The excerpt renders whole, with no highlight and no version control, since there is no other version to diff against or to read.

## Answered, cut short

Rendered whenever the answer stopped for want of prompt room rather than because it finished. A cut answer reads exactly like a complete one, so nothing but this banner distinguishes them.

```plaintext
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │ The answer stopped for want of room, not because it finished.  │  │
│  │ The model ran out of room while writing, so anything it would  │  │
│  │ have said after the last claim here is missing.                │  │
│  └────────────────────────────────────────────────────────────────┘  │
```

Copy, verbatim:

- `The answer stopped for want of room, not because it finished.`
- `The model ran out of room while writing, so anything it would have said after the last claim here is missing.`

The banner keys on the trace's `truncated`, which is the generation stopping, and its copy describes that event. Provisions the prompt budget dropped are a different event: every one of the 24 recorded answers dropped between 3 and 39, and the trace's counts already report them. A banner describing drops would sit on every answer and stop meaning anything.

## Refused

A result, never a failure. It sits in the answer column where an answer would sit and takes none of the failure region's treatment.

```plaintext
├───────────────────────────────────┬──────────────────────────────────┤
│ ( THE TEXT DOES NOT SETTLE THIS ) │ [*The Act*| The walk ]  [Orig|*Am│
│                   ← tag, not an   │ ┌──────────────────────────────┐ │
│                     error         │ │ 20 provisions read before…  ▾│ │ ← one line,
│ The Act makes substantial         │ └──────────────────────────────┘ │   opens the list
│ modification the trigger and      ├──────────────────────────────────┤
│ never defines the threshold…      │ ░ Article 111  AI systems       ░│
│                        ← reason   │ ░ already placed on the market  ░│
│ WHAT IS MISSING                   │ ░ 1. Without prejudice to…      ░│
│ — what counts as a substantial    │ ░ 2. Without prejudice to the   ░│
│   modification                    │ ░ application of Article 5…     ░│
│                                   │                                  │
│ WHAT WAS READ BEFORE SAYING SO ·  │   Article 112  Evaluation and    │
│ 20 PROVISIONS                     │   review                         │
│  │ Article 111(2)  moved…         │                                  │
│  │ Without prejudice to the       │                                  │
│  │ application of Article 5 as…   │ ← each consulted provision        │
│  │ Read all 705 characters…       │   clamped to three lines          │
│  │ Article 3  moved…              │                                  │
│  │ …                              │                                  │
└───────────────────────────────────┴──────────────────────────────────┘
```

Copy, verbatim:

- Tag: `THE TEXT DOES NOT SETTLE THIS`
- Heading: `WHAT IS MISSING`
- Heading: `WHAT WAS READ BEFORE SAYING SO`, followed by the count of provisions
- Reading list control in the pane: `<n> provisions read before refusing`, with `Open list ▾` beside it, reading `Close list ▴` while the list is open
- Reading list filter placeholder: `Article 5`
- Reading list row tags: `search`, `walk`
- Reading list with no match: `Nothing read before refusing matches that number.`, then `Clear filter`
- Reason and the missing items are dynamic.

The pane holds what a refusal read behind that one line rather than as a row of links. The largest recorded refusal read 22 provisions and the live billboard refusal 33, which as links pushed the Act's text five rows down the pane. The list opens over the text, and each row says whether search found the provision or the walk reached it. Its filter matches a citation's number exactly, so `Article 5` finds Article 5 and its paragraphs and never Articles 53 to 56, and `II` finds Annex II and not Annex III. It opens, filters and closes from the keyboard, and Escape returns focus to the line. An answered question keeps its row of links under `Cited in this answer`.

The consulted provisions are not decoration. They carry what was retrieved and found not to answer, which is the difference between a refusal and a shrug, so a refusal that renders without them has lost its argument.

Every consulted provision stays on the list, each clamped to three lines with the same handle an answer's excerpt carries. A refusal's argument is that the text was read and did not settle the question, and the full text of each provision is one activation away in the pane. The recorded refusal that consults 20 provisions and 67 320 characters measured 11 041 pixels tall at 1280 with every provision quoted whole, and 3 287 with each one clamped. That settles the question of capping the list: the count stays, the length goes.

## Unrecorded

Reached only on the deployed build, when a visitor types a description the recording does not hold. It renders in the failure region, where an answer would have been, and takes the neutral treatment rather than the error one.

```plaintext
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │ This page holds a recording, and your description is not in    │  │
│  │ it.                                                            │  │
│  │ Edit the description and pick one of the recorded questions,   │  │
│  │ or run the system locally to ask your own.                     │  │
│  └────────────────────────────────────────────────────────────────┘  │
```

Copy, verbatim:

- `This page holds a recording, and your description is not in it.`
- `Edit the description and pick one of the recorded questions, or run the system locally to ask your own.`

The neutral treatment is the point. The four variants below are something going wrong and this one is the deployment working as built, so painting it in the error role would report a fault where there is none.

The alternative was matching an unrecorded description to the nearest fixture. That answers a question nobody asked with text a model produced for a different one, which is the invention this surface exists to avoid, so the recording says it does not hold the question instead.

## The failure region

One region, five copy variants. Only ever one at a time. Each variant names a different next action, which is why five rather than one: start the model, narrow the description, quote the id, start the service, and pick a recorded question. A timeout is its own variant rather than a shade of error because it is the failure where the work started and waiting longer would not have helped.

Four of the five are something going wrong. The fifth is `Unrecorded` above, which renders here because it sits where an answer would have been, and takes the neutral treatment rather than the error one because it is the deployed build working as built.

```plaintext
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │ The model or the index is not running.                         │  │
│  │ The service is up and could not reach what it needs. Start     │  │
│  │ the model and ask again.                                       │  │
│  │ correlation 8f2a-41d7                            ← quotable    │  │
│  └────────────────────────────────────────────────────────────────┘  │
```

The five, verbatim:

- `The model or the index is not running.` / `The service is up and could not reach what it needs. Start the model and ask again.`
- `The model did not answer inside the budget.` / `Waiting longer would not have helped. Narrow the description and ask again.`
- `Something went wrong that we did not expect.` / `Quote the correlation id and the log will answer.`
- `Nothing is listening on the service port.` / `The service is not running. Start it and ask again.`
- `This page holds a recording, and your description is not in it.` / `Edit the description and pick one of the recorded questions, or run the system locally to ask your own.`

The correlation id renders on the first three and on neither of the last two, since nothing answered on either and so nothing logged one. These sentences are owned by the service seam. A change to them there is a change to this file.

### The next step beside a failure

At 1024 and wider the pane stays beside the failure region and offers the next step for the state shown, rather than leaving half the screen empty. Beside an unrecorded description it lists the twelve recorded questions as picks, scrolling inside the pane. Beside a model that is not running and beside a service that is not listening, it shows the commands that start what is missing, which match the local stack table in `canon/context/development.md`. A timeout and an unexpected failure get neither, since no pick or command answers either, and the pane keeps the terms it held before the ask.

```plaintext
├───────────────────────────────────┬──────────────────────────────────┤
│  ┌─────────────────────────────┐  │ START WHAT IS MISSING            │
│  │ The model or the index is   │  │ The model                        │
│  │ not running.                │  │ ┌──────────────────────────────┐ │
│  │ correlation 106a-0189       │  │ │ ollama serve                 │ │
│  └─────────────────────────────┘  │ └──────────────────────────────┘ │
│                                   │ The service, from python/        │
│                                   │ ┌──────────────────────────────┐ │
│                                   │ │ uv run python -m annex serve │ │
│                                   │ └──────────────────────────────┘ │
│                                   │ Then ask the same description…   │
└───────────────────────────────────┴──────────────────────────────────┘
```

Copy, verbatim:

- Beside an unrecorded description: `Recorded questions you can open`
- Beside an unavailable or unreachable service: `Start what is missing`, `The model`, `The service, from python/`, `Then ask the same description again. Nothing you typed is lost.`

## The trace

The cost line closes the answer column on every state that carries a trace. It is always visible and never behind a disclosure, because cost is reported rather than buried.

```plaintext
│ ─────────────────────────────────│
│ qwen3.8:27b  18 420 prompt  612   │
│ completion  21.3 s                │
│ 12 searched · 31 traversed ·      │
│ 7 dropped → walk in pane          │ ← opens the pane's second view
```

At 1024 and wider the counts open the walk as the pane's second view, beside the Act rather than under the answer. The drawing needs about 570 pixels for three columns, which the pane has and the answer column does not. Below 1024 the counts expand the walk in place under the cost line and the arrow reads `▾`.

The walk view holds the drawing and, under it, three id lists, each capped at roughly eight ids and followed by a count of the rest. On the full-context arm those lists run to hundreds, and an uncapped one would swamp the answer it describes. The count carries the scale and the expansion carries the detail.

Dropped ids are named beside traversed ids and never omitted. Traversal reaches more provisions than a prompt has room for, so reporting what traversal found without reporting what the budget cut overstates what the answer actually rests on.

Two other placements were rendered and lost: the cost line above the answer, where machine output comes before the product's own voice, and the cost line in the pane header, where it leaves the answer column at 1024 and returns under it below.

### The drawing

A layered graph on every state that carries a trace, answered or refused alike. Hop is the column: searched provisions on the left, what they cite next, and what those cite after. A dropped provision draws as a hollow, dashed node at its own hop rather than vanishing, since the budget cutting it is itself part of what the trace reports.

The id lists stay under the drawing. They are its text equivalent for a reader a screen reader serves, and removing them to make room for the drawing would remove that equivalent.

Picked by looking, per `canon:draft-and-pick`, against a baseline of the id lists alone, a non-layered hand-drawn arrangement, and a tree built with `d3-hierarchy`. Recorded in `canon/ARCHITECTURE.md` against what it beat.

A trace carrying no edges, being every fixture recorded before this field existed and every run with traversal switched off, renders no drawing. The id lists render as they always have, so an edgeless trace degrades to the lists rather than to an empty frame.

## Reading the Act

At 1024 and wider the Act is the pane, a region of the one screen rather than something that opens over it. Below 1024 it opens as an overlay over the answer.

```plaintext
┌──────────────────────────────┐
│▓▓▓▓▓┌───────────────────────┐│
│▓▓▓▓▓│ [Orig|*Amended*] Close││ ← header: version
│▓▓▓▓▓├───────────────────────┤│    toggle, close
│▓▓▓▓▓│ Article 6  Rules for… ││
│▓▓▓▓▓│ ┃ 1. AI systems shall ││ ← scrolled to,
│▓▓▓▓▓│ ┃ be classified as…   ││   held in a tint
│▓▓▓▓▓│   2. Providers of AI  ││
│▓▓▓▓▓│   systems already…    ││
│▓▓▓▓▓│                       ││
└──────────────────────────────┘
       ← the overlay, below 1024
```

The Act holds one version's whole text, in document order, as headings with their numbered paragraphs nested under each one. An article, annex or recital carrying no numbered paragraph renders its own text in that heading's place, which is every annex and recital and the small minority of articles with none.

A quieter `EUR-Lex ↗` control sits beside the heading, on every citation, and leaves the page rather than opening the panel: the heading stays the loud control that keeps a reader here, and EUR-Lex is the escape hatch for one who wants the source of record instead. It opens in the same tab, per the project's own link-behavior rule.

It links to the article, annex, or recital the citation's paragraph sits under, since the source HTML anchors each at that level. It lands at the document root only for a citation carrying none of those three kinds, which no provision this project indexes does.

### Copy

- Close control, below 1024: `Close`
- Version toggle: the same segmented pair the top bar draws, `Original` and `Amended 27 Jul 2026`
- Heading text is the citation label the trace already draws (`Article 6`, `Annex III(5)(b)`), not a duplicate of the citation block's own rendering

### Behavior

- Activating a citation's heading or its excerpt handle scrolls the Act to that provision immediately, with no transition, consistent with the motion rule. At 1024 and wider that moves the pane, and below 1024 it opens the overlay first
- Docked, a provision reached from a citation, a step, an arrow key or the jump field lands flush at the top of the Act's text, tinted, and the section bar above it names its article
- The overlay carries no section bar, so there a paragraph lands with its article's heading in view whenever the two fit together, and at its own top only when they do not, since a paragraph read without its article names nothing
- Docked, the left and right arrow keys step the way the section bar's arrows do while the Act's text has focus
- The provision the Act was scrolled to is held in a tinted background so a reader can find it again after scrolling away
- Every paragraph, definition and point renders as a block of its own, led by its name in the form the Act cites it, such as `Annex III, point 4(a)`. A landing from an excerpt that opened on a point tints that block rather than the whole provision
- The version toggle in the Act's header re-renders the Act against the other text. It does not re-ask the question and does not touch the answer
- Below 1024, Escape, the close control, and activating the scrim all return to the answer exactly as it stood before the overlay opened
- The overlay below 1024 is the only overlay this surface carries. At 1024 and wider nothing overlays the answer

## Behavior

- The version toggle re-asks the current question against the other text and replaces the answer. It is a real control, not a demo affordance
- The traversal switch turns reference following off and re-asks. It exists to demonstrate the arm comparison rather than to serve a visitor, and the line under it says what turning it off compares, so the layout does not pretend otherwise
- The top bar stays pinned to the top of the screen. Once the page scrolls past the described system it slims to the mark, the name and the two controls, and the pane below it fills the height left
- Below 1024 and before anything is asked, the bar holds the brand and the theme control, and the version and traversal choices sit under the description. Once a question is asked they move into the bar
- Editing the description returns the surface to its empty state with the previous text in the input
- The trace's counts switch the pane between the Act and the walk at 1024 and wider, and expand the walk in place below. Nothing else on the surface opens or collapses
- The pane holds the terms and the reserved region before a question is asked, and the Act once one is answered or refused
- The theme control chooses between matching the system, light, and dark, and starts on matching the system. A reader who chooses nothing is decided by `prefers-color-scheme`, and a choice is remembered per browser and applied before the first paint, so the page never renders in one theme and swaps to the other
- Every state above replaces the answer column's content. None of them stack, except the moved-citation and cut-short states, which render on top of an answer, and the replay band, which sits above every one of them
- On the deployed build a pick answers immediately and the loading skeleton never renders, because nothing is being asked. The skeleton belongs to the local build and to the recorded walkthrough, where the wait is real
- A claim never renders two citation blocks for one provision. A marker repeated within one claim merges to its first occurrence in `parse_draft`, before the surface ever sees it
- On the deployed build the address carries the recorded question, the version, and the provision the Act is showing, so an answer can be linked and opened as it was shared. A link leaving the page opens in the same tab, since the browser's back action returns to that address
- The local build's address carries the version and the provision alone. A typed description can run to 4 000 characters and says what someone is building, so it never reaches an address the browser keeps in its history

## Not on this surface

There is no navigation rail, no account, no history, and no second screen. The pane is a region of the one screen, and it holds what the question in front of the reader needs rather than a way to move between documents. A visitor asks one question at a time and the surface is that question's answer. The address carries that answer's state on the deployed build without adding a route: there is still one page, and a linked state opens that page as it stood.
