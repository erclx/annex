---
title: Answer
description: The landing page and the ask route, where a described system becomes a list of articles to read, or a refusal
---

# Answer

Three routes carry the product, in one wireframe file rather than three. `/` is the landing page: what the tool does, the composer, the recorded questions, then a line reaching how the pipeline is built and measured. `/evaluation` holds the terms, the pipeline rail and the three-arm comparison. A pick or a submit opens `/ask`, where the described system becomes the answer, the refusal, or the failure, and the browser's back action or the mark in the bar returns to `/`. There is no navigation rail between any of them.

At 1024 pixels and wider `/ask` holds two regions side by side. The answer column on the left keeps a fixed reading measure near 640 pixels, and the pane on the right takes the rest, stays in view as the page scrolls, and scrolls inside itself. Below 1024 the page is one column and the pane opens as an overlay instead.

A claim keeps its evidence directly under it rather than printing the cited law whole: 65 of the 112 citations in the recording run past 1 000 characters, and printing them puts the first recorded answer's second claim 2 836 pixels down the page at 1280.

## The replay band

Rendered under the top bar in every state, and only on the deployed build. A local build calling the service never shows it.

```plaintext
├──────────────────────────────────────────────────────────────────────┤
│ You are looking at a recording. Nothing on this page calls a model.  │
│ This answer was captured from the live system on 2026-09-07.         │
├──────────────────────────────────────────────────────────────────────┤
```

Copy, verbatim, with an answer on screen:

- `You are looking at a recording.`
- `Nothing on this page calls a model.`
- `This answer was captured from the live system on <date>.`

Copy, verbatim, with no answer on screen, on the landing page or on `/ask` before anything is asked:

- `You are looking at a recording.`
- `Nothing on this page calls a model.`
- `Every answer was captured from the live system, most recently on <date>.`

The date is read off the capture manifest rather than written here, so a re-capture moves it and a stale recording cannot claim to be fresh. Each entry carries its own stamp, so a narrowed re-capture can leave two recordings dated differently, and the specific sentence names only the one answer on screen rather than claiming its date for the other twenty-three. The generic sentence covers the set instead, reading as the most recent of the 24 rather than a claim that every recording shares one day. The band carries no commit, per the operator's second-use pass: a visitor has no use for the exact build a recording came from, and the terms strip dropped its matching glossary entry in the same pass.

The band is on the page rather than in a footnote because the claim a visitor would otherwise carry away is that they watched a model answer. They did not. The model this project runs holds 30 GB of a card, nothing hosted answers these questions, and what a deployment can honestly serve is what the live system already said.

The traversal switch is held inactive on this build, and the line under it reads `Recorded with traversal on`. Capture ran with reference following on, so both positions would return one answer and a live switch would lie about it. The version toggle stays live on this build, since both texts were captured and comparing them is what the deployed page is for.

Below 1024 the band shortens to one sentence, so the question starts near the top of a phone screen. The line still says the page is a recording, and the rest sits behind a details control.

```plaintext
├──────────────────────────────┤
│ You are looking at a         │
│ recording.  Details          │ ← opens the rest of the band
├──────────────────────────────┤
```

Copy, verbatim, below 1024:

- `You are looking at a recording.`
- Details control: `Details`

## Empty, at 1024 and wider

The landing page at `/`, reached on arrival. The top bar and the band run the full width. Under them the heading, the supporting text and the composer center on one measure, and the recorded questions follow as a full-width section on a wider one, closing with a line to `/evaluation`. Nothing sits beside the composer.

```plaintext
┌──────────────────────────────────────────────────────────────────────┐
│ ◆ Annex Which articles of the EU AI Act…  Home  Evaluation           │ ← top bar, pinned, and
│                                                                      │   no control on this page
├──────────────────────────────────────────────────────────────────────┤
│          Describe your AI system. Get back the articles              │ ← display, centered,
│                of the AI Act you need to read.                       │   larger than on /ask
│                                                                      │
│          Write it the way you'd explain it to a colleague.           │
│            Annex finds the provisions that apply and…                │
│                                                                      │
│            ┌──────────────────────────────────────────┐              │ ← composer, 640 wide
│            │ A customer-service chatbot…              │              │
│            │                                          │              │
│            │ [ Original |*Amended*] (•) Reference     │              │ ← the choices, inside it
│            │                        traversal         │              │
│            │                        Turn off to…      │              │ ← the hint, visible text
│            │                  [ Find the articles → ] │              │
│            └──────────────────────────────────────────┘              │
│                                                                      │
│   ────────────────────────────────────────────────────────────────   │ ← sections, 1080 wide
│   Or start from a recorded question                                  │
│   Telling a person they are dealing with an AI system                │
│   ┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐     │ ← one card a question
│   │ a chatbot on our │ │ a voice agent    │ │ we generate      │     │
│   │ Answered on both │ │ Answered on both │ │ Refused on the…  │     │
│   └──────────────────┘ └──────────────────┘ └──────────────────┘     │
│   …four groups, three cards each                                     │
│                                                                      │
│   How answers are built and measured →         ← reaches /evaluation │
└──────────────────────────────────────────────────────────────────────┘
```

Copy, verbatim:

- Product name: `Annex`, with the project mark drawn before it
- Tagline: `Which articles of the EU AI Act you have to read`
- Top bar links: `Home`, `Evaluation`, with the repository as a labelled icon rather than a third link
- Traversal hint on the local build: `Turn off to compare against search alone`
- Traversal hint on the deployed build: `Recorded with traversal on`
- Display: `Describe your AI system. Get back the articles of the AI Act you need to read.`
- Supporting text: `Write it the way you'd explain it to a colleague. Annex finds the provisions that apply and quotes each one, so you can check every claim against the law itself. Read against the Act as published or as amended on 27 July 2026. It won't tell you whether you comply.`
- Input placeholder: `A customer-service chatbot that also scores loan applications…`
- Action: `Find the articles`, with an arrow after it that is drawn and never read as part of the name
- Link to the evaluation: `How answers are built and measured →`, reaching `/evaluation`

The last sentence of that supporting text is doing compliance work rather than tone work. No label, heading, or button anywhere on this surface may imply a verdict on whether an organization complies, and the empty state states that boundary before a visitor has asked anything.

The top bar carries `Home`, `Evaluation` and the repository icon in every state and at every width rather than on the empty state alone. A visitor who reaches an answer or a refusal, the moment likeliest to prompt checking the source, can still reach them without editing back to a blank form. The bar keeps one full height throughout, and its mark and name link to `/`, as does `Home` beside `Evaluation`.

The composer is one rounded box on `surface` holding the description, the version toggle, the traversal switch with its hint as visible text, and `Find the articles`. Its footer runs as one row at 1024 and wider and stacks below that. The bar on `/` holds no control, since both choices sit in the composer where the description they apply to is written.

The version toggle is a `rounded-md` group with a 1px `rule` border, wrapping two buttons padded 11px by 5px at 12px text. The active button fills `bg-accent` with `text-paper`, and the inactive one reads `text-muted` with no fill of its own.

The traversal switch is a 30 by 17px pill, `rounded-full`, filling `bg-accent` when on and `bg-rule` when off. A 13px `bg-paper` thumb sits inset 2px from the pill's own edge, at the right when on and the left when off.

The textarea draws no outline of its own. While anything inside the composer has focus, whether the textarea, the version toggle, the traversal switch or `Find the articles`, the card's own border darkens from `rule` to `muted`, measured at 5.38 to 1 against `surface` in light and 6.18 to 1 in dark, against the 1.33 to 1 and 1.30 to 1 it rests at, both past the 3 to 1 a focus indicator is held to. This beats an accent border and ring on the textarea alone, which would spend accent on a state the resize grip's own hover rule already keeps neutral, and beats a deeper shadow, whose border never crosses the 3 to 1 floor. A failed submit's `border-error` still wins over the focus border, and the toggle, the switch and `Find the articles` keep their own keyboard focus rings inside the card.

Nothing sits beside the composer. The pane holding the terms and the comparison is on `/ask` alone, and the terms and the comparison themselves are on `/evaluation`, reached by the line below, per § Evaluation.

The heading renders at 34px and centers with the supporting text on this page alone, a size set by the landing page's placement rather than by the composer's own copy. The composer is 640 wide, which holds its footer on one row with the traversal hint as visible text beside the switch.

## Empty, below 1024

```plaintext
┌──────────────────────────────┐
│ ◆ Annex Home Eval[gh][theme] │ ← one row, tagline hidden here
├──────────────────────────────┤
│ Describe your AI system.     │
│ Get back the articles of the │
│ AI Act you need to read.     │
│                              │
│ Write it the way you'd…      │
│ ┌──────────────────────────┐ │
│ │ A customer-service…      │ │
│ │ [ Original |*Amended*]   │ │ ← the choices, inside
│ │ (•) Reference traversal  │ │   the composer
│ │ [ Find the articles → ]  │ │
│ └──────────────────────────┘ │
│ ──────────────────────────── │
│ Or start from a recorded     │
│ question                     │
│ ┌──────────────────────────┐ │
│ │ a chatbot on our website │ │ ← one card a row
│ │ Answered on both texts   │ │
│ └──────────────────────────┘ │
│ …                            │
│ How answers are built and    │ ← reaches /evaluation
│ measured →                   │
└──────────────────────────────┘
```

The link to `/evaluation` follows the recorded picks in the one column, the same line the landing page sets at 1024 and wider.

### The recorded picks

Rendered under the form on both builds, so the build that can answer anything stops being the one with no route into itself. Each question is a bordered card under its flow label, three across at 1024 and wider and one a row below that.

Under its description each card says how the recording went on the two texts. The line is computed per text from the manifest's `refused` flags rather than typed, so a re-capture that changes an outcome changes the card. Words carry the outcome with no mark beside them: a 6-pixel dot drawn in the refusal and accent colors read as one dark mark in both themes.

Copy, verbatim:

- Heading: `Or start from a recorded question`
- Supporting text: `Twelve descriptions were put to the live system, on both versions of the Act. A description outside those twelve has no recorded answer here.`
- Outcome lines: `Answered on both texts`, `Refused on both texts`, `Refused on the original, answered on the amended`, `Answered on the original, refused on the amended`
- A text the manifest holds no entry for: `not recorded on the original` or `not recorded on the amended` in place of that text's half of the line, so a missing recording never reads as answered
- Flow labels: `Telling a person they are dealing with an AI system`, `Whether a system is high risk, and what follows`, `Changing a system already on the market`, `When an obligation starts to apply`

The picks sit beside the input rather than in place of it. Narrowing the input to a picker would remove the unrecorded state below and change the surface the design was settled on, and the free-text field is what a visitor arrives expecting.

The four flow labels are the evaluation's own grouping, three questions apiece. The fifth demo flow, the three-arm result, is not a question a visitor asks. It renders below as the comparison rather than as a fifth pick.

## Evaluation

Reached from `Evaluation` in the top bar on every route, and from the line under the composer on `/`. The top bar and the band run the full width as they do everywhere else, and the page itself holds a heading, one line naming what it carries, a link out to the full write-up, and the terms strip and the three-arm comparison.

```plaintext
┌──────────────────────────────────────────────────────────────────────┐
│ ◆ Annex Which articles of the EU AI Act…  Home *Evaluation*          │ ← top bar, current
├──────────────────────────────────────────────────────────────────────┤
│   Evaluation                                                         │ ← heading, 1080 wide
│   How an answer is built, and how three ways of answering compare    │
│   on the same questions.                                             │
│   The full write-up is on GitHub →                                   │
│                                                                      │
│   Terms used on this page                                            │
│   Provision      An addressable piece of the law…                    │
│   …six terms in all                                                  │
│                                                                      │
│   How an answer is built        │ The three-arm comparison           │ ← two columns in a
│   Five stages, in the order…    │ The Act fits inside a current…     │   1 040 container
│   ○ Intake                      │ Arm | Text | Recall | …            │
│   ● Retrieve ┐ The comparison   │                                    │
│   ● Traverse ┘ switches these…  │                                    │
│   ○ Synthesize                  │                                    │
│   ○ Verify                      │                                    │
│   Faithfulness is matched against what an arm was supplied…          │
└──────────────────────────────────────────────────────────────────────┘
```

Copy, verbatim:

- Heading: `Evaluation`
- Description line: `How an answer is built, and how three ways of answering compare on the same questions.`
- Link out: `The full write-up is on GitHub →`, to `docs/evaluation.md`

The terms strip gathers the six load-bearing terms that appear unglossed elsewhere on this surface: `provisions`, the `Original` / `Amended 27 Jul 2026` pair, `Reference traversal`, `high risk`, `general-purpose AI model`, and `prohibited practice`. Term and definition sit side by side under the label `Terms used on this page`.

An inline hover definition was drafted and rejected by looking. It is a second overlay on a surface whose only overlay is the pane below 1024, and a gathered strip needs no hover state, so it carries every definition at once.

Under the strip, a labelled region holds the three-arm comparison in two halves with the caveats spanning beneath both. The first half, headed `How an answer is built`, gives a one-sentence lead-in and the pipeline figure. The second, headed `The three-arm comparison`, holds the argument for measuring retrieval against a full-context baseline at all and the table. The table is generated from `python/data/eval/results.json` through the `evaluation-summary.json` fixture rather than transcribed, so it moves when the next `evaluate` run does.

The halves sit side by side, figure on the left, only in a container 1 040 pixels wide or more. Everywhere narrower they stack figure first. This route's section is 1 080 wide at 1280 and wider, so it draws the two halves side by side there. The pane beside a failure on `/ask` and the single column below 1024 stay under that width and draw the stacked form.

The pipeline figure itself draws one of two ways, switching on its own rendered width rather than on which of the states above it sits in. A vertical rail, one stage a row, covers every width side by side and the narrow end of the stacked range. From 657 pixels of the figure's own width, measured where the shortest stage label starts wrapping, it draws a horizontal row instead: the same five stages across, the same bracket under Retrieve and Traverse, filling the width the rail left empty while the halves stack. `pipeline-diagram.tsx` carries both.

Copy, verbatim:

- Headings: `How an answer is built`, `The three-arm comparison`
- Lead-in: `Five stages, in the order a question passes through them.`
- Bracket caption: `The comparison switches these two on and off.`

The caption names no direction. The table sits beside the rail at one width and under it at another, so a caption pointing below or above would be wrong at one of them.

The table carries one row per arm and text: the arm's label, which text it ran against, recall, faithfulness, nodes supplied, and correct refusals over the questions the text does not settle. Recall, faithfulness, precision and cost read as the stable half of the evaluation, and the table treats them as facts. Refusal is carried the same way but captioned rather than trusted: three questions per arm and text is too few to rank the arms on, and the caption under the table says so rather than letting the fraction imply more than it can support.

Beneath both halves, one line names the hardware and the model each arm ran on. The argument above the table explains why the comparison exists: the Act fits inside a current context window, so a model can read the whole document and answer from it, which makes retrieval something to justify rather than assume.

The rail comes first. It draws the five stages a request passes through, intake through verify, with a bracket against retrieve and traverse, so a reader sees where the two switched stages sit inside one answer before reading the table that switches them. Its bracket sits beside the stage text rather than at the far edge of the half.

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
├──────────────────────────────────────────┬───────────────────────────────────┤
│ ┌──────────────────────────────────────┐ │                                   │
│ │ The system you described        Edit │ │                                   │
│ │ a chatbot on our website that…       │ │                                   │
│ │ Answered against  [Orig|*Amended*]   │ │                                   │
│ └──────────────────────────────────────┘ │                                   │
│ ● Restating your description    13.1 s   │ THE WALK, AS IT HAPPENS  12 · 40  │
│   as a search query                      │ FOUND BY    THEIR     CITED FROM  │
│   Query ready                            │ SEARCH      ARTICLE   THERE       │
│ ● Searching the amended text     40 ms   │ • Art 50(1) • Art 50  (56(6))(56) │
│   by meaning                             │ • Art 50(5)                       │
│   12 provisions matched: Article 50(1),  │ • Art 2(10) • Art 2   (102)(103)… │
│   Article 50(5), Article 50(3) and 9 more│ • Art 3               (2(1))(4)   │
│ ● Following the Act's own        40 ms   │                       via 2(1):   │
│   cross-references                       │                       ┆57┆ ┆49┆   │
│   40 provisions reached in 2 hops, 4     │                                   │
│   lifted to their article and 36 cited   │    ← chips appear as ids arrive   │
│ ◉ Drafting an answer that cites  3.3 s   │                                   │
│   what it read                   ← runs  │                                   │
│   15 of the 52 provisions found set      │                                   │
│   aside to fit the prompt budget         │                                   │
│ Elapsed 16.5 s                           │                                   │
└──────────────────────────────────────────┴───────────────────────────────────┘
```

From two seconds into drafting the pane turns to what the model is reading:

```plaintext
┬───────────────────────────────────┤
│ WHAT THE MODEL IS READING 12 · 40 │
│ The walk: 12 found by search, 40  │
│ reached, 15 set aside             │
│                                   │
│ ┃ BEING READ BY THE MODEL ·       │
│ ┃ 1 OF 37 SUPPLIED                │
│ ┃ Article 50(1)                   │
│ ┃ 1. Providers shall ensure that  │
│ ┃ AI systems intended to interact │
│ ┃ directly with natural persons…  │
┴───────────────────────────────────┘
```

Copy, verbatim:

- Step labels: `Restating your description as a search query`, `Searching the amended text by meaning`, `Following the Act's own cross-references`, `Drafting an answer that cites what it read`. The version named in the second follows the toggle
- Step results: `Query ready`, `<n> provisions matched: <first three> and <rest> more`, `<n> provisions reached in <h> hops, <lifted> lifted to their article and <rest> cited from there` or `Nothing reached beyond what search matched`, and `<dropped> of the <found> provisions found set aside to fit the prompt budget` or `All <found> provisions found fit the prompt budget`
- Under the steps: `Elapsed <time>`
- Pane headings: `The walk, as it happens` and then `What the model is reading`, with `Waiting for search to return.` before any id arrives
- Collapsed walk: `The walk: <searched> found by search, <traversed> reached, <dropped> set aside`
- Card caption: `Being read by the model · <i> of <n> supplied`
- On the replay build only, above the steps: `Illustrative pace. These steps replay the recording 5 times faster than it ran, and the times beside them are this replay's, not the model's.`

Each step shows its dot, its own elapsed time, and its result once its stream frame arrives. The times are the reader's own wait, taken in the browser as each frame lands, so nothing states a duration that did not happen. Live, restating takes 13 to 14 seconds, search and traversal land within 50 milliseconds of each other, and drafting runs about 28 seconds more. The drafting step names the budget's cut as soon as the budget frame arrives, before the model call ends.

The card shows provisions the budget handed the model and says they are being read. It never says cited, since no citation exists while drafting runs and the answer keeps fewer than the model was supplied. Its text comes from the corpus export the page already ships, and a provision the prompt numbered twice counts once.

At 1024 and wider the pane holds the walk and then the card, which keeps the right half of the screen from sitting empty through the wait. Below 1024 the steps render alone, and the finished walk is where the chips appear.

## Answered, at 1024 and wider

The plain case. No provision moved, nothing cut.

```plaintext
┌──────────────────────────────────────────────────────────────────────┐
│ Annex  Which articles of the EU AI Act…   Home  Evaluation           │
│                                     (•) Reference traversal          │ ← the switch alone
├───────────────────────────────────┬──────────────────────────────────┤
│ ┌───────────────────────────────┐ │ [*The Act*| The walk ]           │ ← pane header
│ │ The system you described Edit │ │ Reading the amended text         │
│ │ A customer-service chatbot    │ │ Read the original text           │ ← swaps the pane text only
│ │ for a Swedish retail bank…    │ │ Cited in this answer             │
│ │ ───────────────────────────── │ │ *Article 50(1)*  Article 50(6)   │ ← jumps the pane
│ │ Answered against [Orig|*Am*]  │ ├──────────────────────────────────┤ ← the one version toggle
│ └───────────────────────────────┘ │ ‹ Article 50   55 of 146  Go to ›│ ← section bar
│                                   ├──────────────────────────────────┤
│ The chatbot has to tell the       │ ░ Article 50  Transparency…    ░ │
│ person they are interacting with  │ ░ 1. Providers shall ensure    ░ │ ← scrolled to,
│ an AI system.        ← claim      │ ░ that AI systems intended to  ░ │   held in a tint
│                                   │ ░ interact directly with…      ░ │
│  │ Article 50(1)  AMENDED         │   2. Providers of AI systems,    │
│  │ Providers shall ensure that AI │   including general-purpose…     │
│  │ systems intended to interact   │                                  │
│  │ directly with natural persons  │   3. Deployers of an emotion     │
│  │ are designed and developed in… │   recognition system…            │
│  │ Read all 702 characters… →     │                                  │
│                                   │                   ← the whole    │
│ The disclosure obligation does    │                     Act, scrolls │
│ not apply where it is obvious…    │                     inside itself│
│                                   │                                  │
│  │ Article 50(6)  AMENDED         │                                  │
│  │ Paragraphs 1 to 4 shall not…   │                                  │
│  │ Read all 227 characters… →     │                                  │
│ ───────────────────────────────── │                                  │
│ qwen3.8:27b  7 940 prompt  288…   │                                  │
│ 8 searched · 11 traversed · 0     │                                  │
│ dropped → walk in pane  ← trace   │                                  │
└───────────────────────────────────┴──────────────────────────────────┘
```

A claim is set in the interface's own voice and a quoted provision in a serif behind a left rule, so the two are never mistaken for each other. Every claim carries at least one citation. A claim that reached the surface with none is a contract violation rather than a layout case.

The excerpt under a claim shows at most six lines of the provision and always ends in `Read all <n> characters in the Act →`. The handle names the length whether or not the clamp cut the quote, since whether six lines hold a provision depends on the width the column renders at, and a handle that named the length only when it guessed a cut would sometimes sit under a cut quote reading as whole. Activating that line or the citation's heading scrolls the pane to the provision.

A long provision rarely rests a claim on its first six lines, so the excerpt opens on the closest point. Each cited provision is cut at its own paragraphs, definitions and points, and the passage sharing the most words of four letters or more with the claim wins once it shares at least 8. The heading then names that passage, such as `Article 79(8)` or `Annex III, point 4(a)`, the excerpt opens on it behind an ellipsis, and the heading and the handle both land the Act there. Where no passage reaches 8, the excerpt stays at the top and says no single passage wins. A provision with fewer than two numbered passages carries no label at all, since there is nothing to choose between.

The label says closest and never quoted. The rule is lexical, and nothing records which passage the model read the claim from.

The pane opens on the first provision the answer cites. Its list of cited provisions carries every citation in the answer once, in the order the claims first cite them, and marks the one the pane is showing.

Copy, verbatim:

- Excerpt landing label: `closest point`
- Excerpt label when no passage wins: `whole provision, no single passage wins`
- Pane views: `The Act`, `The walk`
- Described system label: `The system you described`, with `Edit description` at the end of the same row
- Described system version row: `Answered against`
- Pane version line: `Reading the amended text` or `Reading the original text`, followed by `Read the original text` or `Read the amended text`
- Cited list label: `Cited in this answer`
- Excerpt handle: `Read all <n> characters in the Act →`, where `<n>` is the provision's own length
- Column handle, the divider between the answer and the pane: `Resize the answer and the Act`
- Section bar steps: `Previous section`, `Next section`, and `Previous cited provision`, `Next cited provision` once switched to citations
- Section bar switch: `Whole Act`, `Cited`
- Section bar jump field placeholder: `Go to`
- Section bar position, dynamic: `<n> of <total>` through the whole Act, `<n> of <total> cited` through citations

The divider between the answer and the pane is a handle. Dragging it, or stepping it with the arrow keys, sets the answer column anywhere from 480 to 760 pixels, and a double-click or Enter puts it back at 640. It remembers. A small rounded grip with three dots sits on the line so the divider reads as draggable before the pointer finds it, darkening to neutral ink on hover and to accent only on keyboard focus.

The section bar sits over the Act's text. It names the article or cited paragraph in view with its place in the whole, steps to the section before or after it or, once switched to `Cited`, to the citation before or after, and takes an article number or annex numeral in its jump field.

The pane's own view switch, between `The Act` and `The walk`, is tabs rather than the filled segmented control the section bar's `Whole Act` and `Cited` switch draws. The selected label reads in `ink` over a 2px `accent` underline, the unselected one in `muted` over a transparent underline of the same width so neither label shifts, and no wrapper box or fill sits behind either. A `bg-ink` fill on this switch's selected label would read as a near-white block in dark against `accent`'s own blue, where every other toggle on the surface, the version toggle, the theme control and the section bar's own switch, fills with `accent` instead. The underline measures 8.61 to 1 on `surface` in light and 7.63 to 1 in dark, and the unselected label 5.38 and 6.18. `Whole Act` stays the only filled control in the pane.

## Answered, below 1024

```plaintext
┌──────────────────────────────┐
│ ┌──────────────────────────┐ │
│ │ The system you described │ │
│ │         Edit description │ │
│ │ A customer-service…      │ │
│ │ ──────────────────────── │ │
│ │ Answered against         │ │
│ │ [ Original |*Amended*]   │ │ ← the one version toggle
│ │ (•) Reference traversal  │ │ ← the switch, since the bar
│ │ Turn off to compare…     │ │   holds none below 1024
│ └──────────────────────────┘ │
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

Those two figures answer whether the underline reads as a mark against its own tint. The mark's own text color is what answers whether the changed word itself can be read: it takes the color of the text it sits in, the same 8.53 to 1 in light and 6.88 to 1 in dark the Act's surrounding text reads at, so a changed word reads exactly as legibly as the words around it. A run of changed words separated only by whitespace also joins into one mark with one unbroken underline, punctuation still breaking a run, so Article 50(7) draws 8 marks.

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

The banner keys on the trace's `truncated`, which is the generation stopping, and its copy describes that event. Provisions the prompt budget dropped are a different event, reported by the trace's own counts rather than by this banner: nearly every recorded answer drops some, so a banner naming drops would sit on almost every answer and stop meaning anything.

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

The pane holds what a refusal read behind that one line rather than as a row of links, since a refusal can read enough provisions that links would push the Act's text several rows down the pane. The list opens over the text, and each row says whether search found the provision or the walk reached it. Its filter matches a citation's number exactly, so `Article 5` finds Article 5 and its paragraphs and never Articles 53 to 56, and `II` finds Annex II and not Annex III. It opens, filters and closes from the keyboard, and Escape returns focus to the line. An answered question keeps its row of links under `Cited in this answer`.

The consulted provisions are not decoration. They carry what was retrieved and found not to answer, which is the difference between a refusal and a shrug, so a refusal that renders without them has lost its argument.

Every consulted provision stays on the list, each clamped to three lines with the same handle an answer's excerpt carries. A refusal's argument is that the text was read and did not settle the question, and the full text of each provision is one activation away in the pane. Quoting every consulted provision whole would run a refusal citing 20 provisions and 67 320 characters to 11 041 pixels tall at 1280. Clamping each one to three lines holds it to 3 287. The count stays on the list and the length goes.

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

At 1024 and wider the pane stays beside the failure region and offers the next step for the state shown, rather than leaving half the screen empty. Beside an unrecorded description it lists the twelve recorded questions as picks, scrolling inside the pane. Beside a model that is not running and beside a service that is not listening, it shows the commands that start what is missing, which match the local stack table in `canon/context/development.md`. A timeout and an unexpected failure get neither, since no pick or command answers either, and the pane holds the terms and the comparison the landing page sets as its sections, under the label `Terms and the comparison`.

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

At 1024 and wider the counts open the walk as the pane's second view, beside the Act rather than under the answer. Below 1024 the counts expand the same walk in place under the cost line and the arrow reads `▾`. The chips wrap to whichever width they get, and below 520 pixels of their own width the three columns stack, each indented under the one before, so the walk reads at 400 where the layered drawing did not.

The walk view holds a summary sentence, the chips, and under them three id lists, each capped at roughly eight ids and followed by a count of the rest. On the full-context arm those lists run to hundreds, and an uncapped one would swamp the answer it describes. The count carries the scale and the expansion carries the detail.

The three lists render as a two-column `dl`, a 96px label column naming `searched`, `traversed` or `dropped` in `ink` beside a `1fr` value column of ids at 11px mono. A list's value column tints `text-warning` wherever it carries a note, and `dropped` is the only one that does today, closed with its own note sentence, `Reached by traversal, cut by the prompt budget, never read.`, so a reader sees which list carries the caveat before reading the note itself.

Dropped ids are named beside traversed ids and never omitted. Traversal reaches more provisions than a prompt has room for, so reporting what traversal found without reporting what the budget cut overstates what the answer actually rests on.

Two other placements lose: the cost line above the answer puts machine output before the product's own voice, and the cost line in the pane header leaves the answer column at one width at 1024 and returns it under a different one below.

### The chips

```plaintext
│ Search found 12 provisions. The walk lifted 4 of them to their whole      │
│ article and followed references to 36 more. Of the 52 reached, 15 were    │
│ set aside to fit the prompt, shown dashed, and never read.                │
│                                                                           │
│ FOUND BY SEARCH   THEIR ARTICLE   CITED FROM THERE                        │
│ • Article 50(1)   • Article 50    ┆Article 56(6)┆ ┆Article 56┆            │
│ • Article 2(10)   • Article 2     (Annex I) (Article 102) (Article 103)   │
│                                   (Article 104) ┆Article 112┆           │
│ • Article 3                       (Article 2(1)) ┆Article 4┆              │
│                                   via Article 2(1): ┆Article 57┆          │
│                                                                           │
│ Dashed: reached, set aside to fit the prompt, never read                  │
```

The walk as chips on every state that carries a trace, answered or refused alike. A row per search result holds the paragraph search found, the article the walk lifted it to, and everything cited from there as wrapped chips. A group a hop further sits in the same row under the chip that reached it, led by `via` and that chip's name. A row per result replaces curves between columns: every edge has exactly one source, so a provision always sits in its source's row and no link crosses another.

Copy, verbatim: the column names `Found by search`, `Their article` and `Cited from there`, and the legend `Dashed: reached, set aside to fit the prompt, never read`. The summary sentence is computed from each answer's own counts, never written for one fixture.

Every chip is a button named by its citation, with `, set aside to fit the prompt` added to the name of a dropped one. Hovering or focusing a chip traces the path that reached it back to search and fades the rest. Activating one opens that provision in the Act, which at 1024 and wider also switches the pane back to the Act view.

A set-aside provision stays in its row, dashed and faded, rather than vanishing, since the budget cutting it is part of what the trace reports. The id lists stay under the chips as the raw ids a reader checks a trace against.

A trace carrying no edges, being every run with traversal switched off, keeps the `Found by search` column alone. A trace recorded before edges existed puts what the walk reached into one group on the last row rather than dropping it.

## Reading the Act

At 1024 and wider the Act is the pane, a region of `/ask` rather than something that opens over it. Below 1024 it opens as an overlay over the answer.

```plaintext
┌──────────────────────────────┐
│▓▓▓▓▓┌───────────────────────┐│
│▓▓▓▓▓│ Reading the amended   ││ ← header: which text
│▓▓▓▓▓│ text  Read the orig…  ││    shows, a link to the
│▓▓▓▓▓│                Close  ││    other, and close
│▓▓▓▓▓├───────────────────────┤│
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
- Version line: `Reading the amended text` or `Reading the original text`, followed by the link `Read the original text` or `Read the amended text`, in the wording the per-citation control already uses
- Heading text is the citation label the trace already draws (`Article 6`, `Annex III(5)(b)`), not a duplicate of the citation block's own rendering

### Behavior

- Activating a citation's heading or its excerpt handle scrolls the Act to that provision immediately, with no transition, consistent with the motion rule. At 1024 and wider that moves the pane, and below 1024 it opens the overlay first
- Docked, a provision reached from a citation, a step, an arrow key or the jump field lands 12px under the section bar's own border rather than flush against it, tinted, and the section bar above it names its article. A 12px strip of the pane's own ground pins under the section bar, and the landing stops 12px short, so nothing of the provision before it shows there
- A landed paragraph takes the same rounded, padded tint a landed section already carries, rather than a square edge-to-edge one, so the two landings read as one kind of mark
- The overlay carries no section bar, but a one-line label above the text names the open article and stays in view regardless of scroll. A paragraph still lands with its article's heading in view whenever the two fit together, and at its own top only when they do not, since the label is what keeps the article named either way
- Docked, the left and right arrow keys step the way the section bar's arrows do while the Act's text has focus
- The provision the Act was scrolled to is held in a tinted background so a reader can find it again after scrolling away
- Every paragraph, definition and point renders as a block of its own, led by its name in the form the Act cites it, such as `Annex III, point 4(a)`. A landing from an excerpt that opened on a point tints that block rather than the whole provision
- The link in the Act's header re-renders the Act against the other text. It does not re-ask the question and does not touch the answer, which is why it is drawn as a line and a link rather than as the toggle the described-system card carries. It is a native button, so the keyboard reaches it
- Below 1024, Escape, the close control, and activating the scrim all return to the answer exactly as it stood before the overlay opened
- The overlay below 1024 is the only overlay this surface carries. At 1024 and wider nothing overlays the answer

## Behavior

- The version toggle re-asks the current question against the other text and replaces the answer. It is a real control, not a demo affordance. It sits in the composer on `/` and in the described-system card on `/ask`, and no screen draws two controls carrying `Original` and `Amended 27 Jul 2026` at once
- The traversal switch turns reference following off and re-asks. It exists to demonstrate the arm comparison rather than to serve a visitor, and the line under it says what turning it off compares, so the layout does not pretend otherwise
- The top bar stays pinned to the top of the screen at one full height, and the pane below it fills the height left. The mark and the name link to `/`, the landing page, with the previous text still in the composer
- On `/`, both choices sit in the composer at every width. On `/ask` the version toggle sits in the described-system card, and the traversal switch sits in the bar at 1024 and wider and in the card below it, its hint visible text in both
- Editing the description returns to `/` with the previous text in the composer
- The trace's counts switch the pane between the Act and the walk at 1024 and wider, and expand the walk in place below. A chip in the walk opens its provision in the Act. Nothing else on the surface opens or collapses
- The pane exists on `/ask` alone. It holds the steps while a question runs, the Act once one is answered or refused, and the next step or the terms beside a failure
- The theme control chooses between matching the system, light, and dark, and starts on matching the system. A reader who chooses nothing is decided by `prefers-color-scheme`, and a choice is remembered per browser and applied before the first paint, so the page never renders in one theme and swaps to the other
- Every state above replaces the answer column's content. None of them stack, except the moved-citation and cut-short states, which render on top of an answer, and the replay band, which sits above every one of them
- On the deployed build a pick or a reopened address plays the recording's steps and walk before answering, at an illustrative pace a fifth of the recording's own time, under the label § Loading gives. The ids, the edges and the budget's cut are the recording's, and only the timing is invented. The version toggle re-asks without playing, so comparing the two texts stays instant there
- A claim never renders two citation blocks for one provision. A marker repeated within one claim merges to its first occurrence in `parse_draft`, before the surface ever sees it
- On the deployed build the address carries the recorded question, the version, and the provision the Act is showing, so an answer can be linked and opened as it was shared. A link leaving the page opens in the same tab, since the browser's back action returns to that address
- The local build's address carries the version and the provision alone. A typed description can run to 4 000 characters and says what someone is building, so it never reaches an address the browser keeps in its history
- A pick or a valid submit on `/` navigates to `/ask`, and the browser's back action returns to `/`. A typed description crosses in memory the root layout holds, never in storage or the address, so `/ask` opened with nothing to ask, such as a reload on the live build or a bare visit, replaces itself with `/`. A description the service rejects returns to `/` with the message on the composer
- On the deployed build a link shared as `/?q=…` forwards to the same answer at `/ask?q=…`, keeping the version and the provision. An address carrying a version alone stays on `/` and sets the composer's toggle
- A return to `/ask` matching the description, the text and the traversal setting of the last settled answer left there shows that answer with no call to ask, and restores the page scroll, the pane scroll and the open provision rather than landing at the top. The root layout keeps that one answer beside the handoff it already holds, so it survives the round trip in memory alone and one answer stays kept until another question replaces it. Below 1024 the overlay stays closed on a restore, and the answer and the page scroll come back regardless. Leaving with an ask still in flight keeps nothing, and a return to it asks again
- `Home` and `Evaluation` are both in-site links in the top bar, on every route, and each marks itself current with `aria-current="page"` on its own route and neither does on `/ask`. The repository leaves the text row for a labelled icon in its own bordered box beside the theme control, keeping its own external anchor. The line under the composer on `/` reaches the same route as `Evaluation`

## Not on this surface

There is no navigation rail, no account, and no history. Three routes carry the product, `/`, `/ask` and `/evaluation`, and nothing moves between them except a pick, a submit, the back action, the mark, `Home`, Edit description, and the `Evaluation` link. The mark still reaches `/` beside `Home`, so a reader loses no way home the pick added a word to rather than replaced. The pane is a region of `/ask`, and it holds what the question in front of the reader needs rather than a way to move between documents. A visitor asks one question at a time and `/ask` is that question's answer. The address carries that answer's state on `/ask` and adds no field for the split: a linked state opens `/ask` as it stood. `/evaluation` carries no state of its own in the address, since nothing on it is chosen or typed.
