---
title: Answer
description: The single surface where a described system becomes a list of articles to read, or a refusal
---

# Answer

One surface carries the whole product. A visitor describes a system, and the same page becomes the answer, the refusal, or the failure. There is no navigation and no second screen.

At 1024 pixels and wider the screen holds two regions side by side. The answer column on the left keeps a fixed reading measure near 640 pixels, and the pane on the right takes the rest, stays in view as the page scrolls, and scrolls inside itself. Below 1024 the page is one column and the pane opens as an overlay instead.

The shape was picked by looking, over three rounds of candidates rendered against recorded answers at their real size and at 1280, 1536 and 400 pixels wide. `.claude/context/design-references.md` holds the products each candidate answered to, and `.claude/ARCHITECTURE.md` records each pick against what it beat. A claim keeps its evidence directly under it, which is the property the first layout comparison chose inline citations for. What it no longer does is print the law whole: 65 of the 112 citations in the recording run past 1 000 characters, and printing them put the first recorded answer's second claim 2 836 pixels down the page at 1280.

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

The traversal switch is held inactive on this build and its chip reads `recorded` rather than `demo`. Capture ran with reference following on, so both positions would return one answer and a live switch would lie about it. Beside it the version control is untouched, since both texts were captured and comparing them is what the deployed page is for.

## Empty, at 1024 and wider

Reached on arrival, before anything is asked. The top bar and the band run the full width, and everything under them starts from the same left edge rather than centering in a narrow container.

```plaintext
┌──────────────────────────────────────────────────────────────────────┐
│ Annex  Which articles of the EU AI Act…   Repository  Evaluation     │
│                        [ Original |*Amended 27 Jul 2026*]  (•) …    │ ← top bar
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

- Product name: `Annex`
- Tagline: `Which articles of the EU AI Act you have to read`
- Top bar links: `Repository`, `Evaluation`
- Display: `Describe what you are building. You get back the articles you have to read.`
- Supporting text: `Plain language is enough. Annex reports which provisions apply and quotes them, against your choice of the original text or the text as amended on 27 July 2026. Every claim carries the article text it came from, so you check the answer rather than trust it. It does not tell you whether you comply.`
- Input placeholder: `A customer-service chatbot that also scores loan applications…`
- Action: `Find the articles`
- Pane label: `Before you ask`

The last sentence of that supporting text is doing compliance work rather than tone work. No label, heading, or button anywhere on this surface may imply a verdict on whether an organization complies, and the empty state states that boundary before a visitor has asked anything.

The top bar carries `Repository` and `Evaluation` in every state rather than on the empty state alone. A visitor who reaches an answer or a refusal, the moment likeliest to prompt checking the source, can still reach them without editing back to a blank form.

The pane holds context beside the question before it holds the Act. Three other contents were rendered and lost: no pane at all until something is asked, the Act open at Article 3, and a recorded answer previewed. `.claude/ARCHITECTURE.md` carries what each cost.

## Empty, below 1024

```plaintext
┌──────────────────────────────┐
│ Annex                        │
│ [ Original |*Amended*]       │
│ (•) Reference traversal      │ ← top bar wraps
├──────────────────────────────┤
│ Describe what you are        │
│ building. You get back the   │
│ articles you have to read.   │
│                              │
│ Plain language is enough…    │
│ ┌──────────────────────────┐ │
│ │ A customer-service…      │ │
│ └──────────────────────────┘ │
│ [ Find the articles ]        │
│ ──────────────────────────── │
│ Or read one of the recorded  │
│ questions                    │
│ …                            │
│ TERMS USED ON THIS PAGE      │ ← the pane's content,
│ …                            │   under the picks
│ ┌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌┐ │
│ ╎ comparison, reserved     ╎ │
│ └╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌┘ │
└──────────────────────────────┘
```

Nothing the pane holds is lost at this width. The terms and the reserved region follow the recorded picks in the one column.

### The recorded picks

Rendered under the form on both builds, so the build that can answer anything stops being the one with no route into itself. Each question is one row of plain text under its flow label, separated by a hairline rather than boxed.

Copy, verbatim:

- Heading: `Or read one of the recorded questions`
- Supporting text: `These are the twelve descriptions the live system was asked, against both texts. Anything else reaches a state saying the recording does not hold it.`
- Flow labels: `Telling a person they are dealing with an AI system`, `Whether a system is high risk, and what follows`, `Changing a system already on the market`, `When an obligation starts to apply`

The picks sit beside the input rather than in place of it. Narrowing the input to a picker would remove the unrecorded state below and change the surface the design was settled on, and the free-text field is what a visitor arrives expecting.

The four flow labels are the evaluation's own grouping, three questions apiece. The fifth demo flow, the three-arm result, has no screen yet and holds the reserved region below.

### The terms strip

Gathers the seven load-bearing terms that appear unglossed elsewhere on this surface: `provisions`, the `Original` / `Amended 27 Jul 2026` pair, `Reference traversal`, `high risk`, `general-purpose AI model`, `prohibited practice`, and the bare commit hash. Term and definition sit side by side under the label `Terms used on this page`.

An inline hover definition was drafted and rejected by looking. It is a second overlay on a surface whose only overlay is the pane below 1024, and a gathered strip needs no hover state, so it carries every definition at once.

### The reserved comparison region

A dashed, labelled region under the terms, holding the place where the three-arm comparison will sit. It carries no figures until that work lands, and nothing else may take the region in the meantime.

Copy, verbatim: `Reserved: the three-arm comparison`

## Invalid

Reached when the description is empty or past the length bound. The service never started work, so this never renders in the failure region.

```plaintext
│   ┌──────────────────────────────────────────────┐                   │
│   │                                              │   ← input, in its  │
│   └──────────────────────────────────────────────┘      error edge   │
│   A description is needed before this can be answered.               │
│                                                                      │
│   [ Find the articles ]                              ← held inactive  │
```

Copy, verbatim: `A description is needed before this can be answered.`

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
│  │ Article 50(1)  AMENDED         │ ░ Article 50  Transparency…    ░ │
│  │ Providers shall ensure that AI │ ░ 1. Providers shall ensure    ░ │ ← scrolled to,
│  │ systems intended to interact   │ ░ that AI systems intended to  ░ │   held in a tint
│  │ directly with natural persons  │ ░ interact directly with…      ░ │
│  │ are designed and developed in… │   2. Providers of AI systems,    │
│  │ Open in the Act →   ← excerpt  │   including general-purpose…     │
│                                   │                                  │
│ The disclosure obligation does    │   3. Deployers of an emotion     │
│ not apply where it is obvious…    │   recognition system…            │
│                                   │                                  │
│  │ Article 50(6)  AMENDED         │                   ← the whole    │
│  │ Paragraphs 1 to 4 shall not…   │                     Act, scrolls │
│  │ Open in the Act →              │                     inside itself│
│ ───────────────────────────────── │                                  │
│ qwen3.8:27b  7 940 prompt  288…   │                                  │
│ 8 searched · 11 traversed · 0     │                                  │
│ dropped → walk in pane  ← trace   │                                  │
└───────────────────────────────────┴──────────────────────────────────┘
```

A claim is set in the interface's own voice and a quoted provision in a serif behind a left rule, so the two are never mistaken for each other. Every claim carries at least one citation. A claim that reached the surface with none is a contract violation rather than a layout case.

The excerpt under a claim shows at most six lines of the provision. A provision that fits whole ends in `Open in the Act →`. One that is cut ends with an ellipsis and `Read all <n> characters in the Act →`, naming its length so the clamp is never mistaken for the whole text. Activating that line or the citation's heading scrolls the pane to the provision.

The pane opens on the first provision the answer cites. Its list of cited provisions carries every citation in the answer once, in the order the claims first cite them, and marks the one the pane is showing.

Copy, verbatim:

- Pane views: `The Act`, `The walk`
- Cited list label: `Cited in this answer`
- Excerpt handles: `Open in the Act →`, `Read all <n> characters in the Act →`, where `<n>` is the provision's own length

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
│  │ Open in the Act →         │ ← opens the overlay
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

## Answered, cut short

Rendered whenever the answer stopped for want of prompt room rather than because it finished. A cut answer reads exactly like a complete one, so nothing but this banner distinguishes them.

```plaintext
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │ The answer stopped for want of room, not because it finished.  │  │
│  │ 7 of the 31 provisions traversal reached were cut before the   │  │
│  │ model read them. They are named under the trace as dropped.    │  │
│  └────────────────────────────────────────────────────────────────┘  │
```

Copy, verbatim: `The answer stopped for want of room, not because it finished.` Both counts in the second sentence are dynamic.

## Refused

A result, never a failure. It sits in the answer column where an answer would sit and takes none of the failure region's treatment.

```plaintext
├───────────────────────────────────┬──────────────────────────────────┤
│ ( THE TEXT DOES NOT SETTLE THIS ) │ [*The Act*| The walk ]  [Orig|*Am│
│                   ← tag, not an   │ READ BEFORE REFUSING             │
│                     error         │ Article 111(2)  Article 3        │
│ The Act makes substantial         │ Article 6(3)  Article 43(4) …    │ ← all twenty
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
- Cited list label in the pane: `Read before refusing`
- Reason and the missing items are dynamic.

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

Picked by looking, per `canon:draft-and-pick`, against a baseline of the id lists alone, a non-layered hand-drawn arrangement, and a tree built with `d3-hierarchy`. Recorded in `.claude/ARCHITECTURE.md` against what it beat.

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
- The provision the Act was scrolled to is held in a tinted background so a reader can find it again after scrolling away
- The version toggle in the Act's header re-renders the Act against the other text. It does not re-ask the question and does not touch the answer
- Below 1024, Escape, the close control, and activating the scrim all return to the answer exactly as it stood before the overlay opened
- The overlay below 1024 is the only overlay this surface carries. At 1024 and wider nothing overlays the answer

## Behavior

- The version toggle re-asks the current question against the other text and replaces the answer. It is a real control, not a demo affordance
- The traversal switch turns reference following off and re-asks. It exists to demonstrate the arm comparison rather than to serve a visitor, and it is labelled as a demo on screen so the layout does not pretend otherwise
- Editing the description returns the surface to its empty state with the previous text in the input
- The trace's counts switch the pane between the Act and the walk at 1024 and wider, and expand the walk in place below. Nothing else on the surface opens or collapses
- The pane holds the terms and the reserved region before a question is asked, and the Act once one is answered or refused
- The theme control chooses between matching the system, light, and dark, and starts on matching the system. A reader who chooses nothing is decided by `prefers-color-scheme`, and a choice is remembered per browser and applied before the first paint, so the page never renders in one theme and swaps to the other
- Every state above replaces the answer column's content. None of them stack, except the moved-citation and cut-short states, which render on top of an answer, and the replay band, which sits above every one of them
- On the deployed build a pick answers immediately and the loading skeleton never renders, because nothing is being asked. The skeleton belongs to the local build and to the recorded walkthrough, where the wait is real
- A claim never renders two citation blocks for one provision. A marker repeated within one claim merges to its first occurrence in `parse_draft`, before the surface ever sees it
- On the deployed build the address carries the recorded question, the version, and the provision the Act is showing, so an answer can be linked and opened as it was shared. A link leaving the page opens in the same tab, since the browser's back action returns to that address

## Not on this surface

There is no navigation rail, no account, no history, and no second screen. The pane is a region of the one screen, and it holds what the question in front of the reader needs rather than a way to move between documents. A visitor asks one question at a time and the surface is that question's answer. The address carries that answer's state on the deployed build without adding a route: there is still one page, and a linked state opens that page as it stood.
