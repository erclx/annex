---
title: Answer
description: The single surface where a described system becomes a list of articles to read, or a refusal
---

# Answer

One surface carries the whole product. A visitor describes a system, and the same page becomes the answer, the refusal, or the failure. There is no second screen and no navigation.

The layout was chosen by rendering three candidates and looking at them. Citations sit inline under the claim they support, rather than in a right rail or a bottom drawer, because proximity is the one property that never breaks: a claim and its evidence need no reference number, no glance sideways, and no click. The cost is measured and real. Inline citations spread three claims over roughly twice the vertical run that a rail does, and every citation added spreads them further.

## Empty

Reached on arrival, before anything is asked.

```plaintext
┌──────────────────────────────────────────────────────────────────────┐
│ Annex   Which articles of the EU AI Act you have to read             │
│                          [ Original |*Amended 27 Jul 2026*]  (•) …   │
├──────────────────────────────────────────────────────────────────────┤ ← top bar
│                                                                      │
│   Describe what you are building. You get back                       │
│   the articles you have to read.                     ← display        │
│                                                                      │
│   Plain language is enough. Annex reports which                      │
│   provisions apply and quotes them, against your      ← what it       │
│   choice of the original text or the text as            refuses to be │
│   amended on 27 July 2026. It does not tell you                      │
│   whether you comply.                                                │
│                                                                      │
│   ┌──────────────────────────────────────────────┐                   │
│   │ A customer-service chatbot that also scores  │   ← description    │
│   │ loan applications…                           │      input        │
│   └──────────────────────────────────────────────┘                   │
│                                                                      │
│   [ Find the articles ]                                              │
│                                                                      │
│         the block above sits in one column, well short of the        │
│         full frame width, so the headline and the input agree        │
└──────────────────────────────────────────────────────────────────────┘
```

Copy, verbatim:

- Product name: `Annex`
- Tagline: `Which articles of the EU AI Act you have to read`
- Display: `Describe what you are building. You get back the articles you have to read.`
- Supporting text: `Plain language is enough. Annex reports which provisions apply and quotes them, against your choice of the original text or the text as amended on 27 July 2026. It does not tell you whether you comply.`
- Input placeholder: `A customer-service chatbot that also scores loan applications…`
- Action: `Find the articles`

The last sentence of that supporting text is doing compliance work rather than tone work. No label, heading, or button anywhere on this surface may imply a verdict on whether an organization complies, and the empty state states that boundary before a visitor has asked anything.

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

The skeleton takes the shape of the answer rather than of generic bars, so the wait previews the result. The stated range is drawn from measured warm runs and belongs in the copy, because a number tells a reader more than a spinner does.

## Answered

The plain case. No provision moved, nothing cut.

```plaintext
┌──────────────────────────────────────────────────────────────────────┐
│ Annex   Which articles of the EU AI Act you have to read             │
│                          [ Original |*Amended 27 Jul 2026*]  (•) …   │
├──────────────────────────────────────────────────────────────────────┤
│ THE SYSTEM YOU DESCRIBED                             ← label          │
│ A customer-service chatbot for a Swedish retail bank…                │
│ Edit description                                                     │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│ The chatbot has to tell the person they are           ← claim, the    │
│ interacting with an AI system.                           answer's     │
│                                                          own voice    │
│  │ Article 50(1)  AMENDED                             ← citation,     │
│  │ Providers shall ensure that AI systems intended       marked by a  │
│  │ to interact directly with natural persons are         left rule    │
│  │ designed and developed in such a way that the                      │
│  │ natural persons concerned are informed.            ← the Act's own │
│                                                          words        │
│ The disclosure obligation does not apply where it is                 │
│ obvious to a reasonably well-informed person that                    │
│ they are interacting with an AI system.                              │
│                                                                      │
│  │ Article 50(1)  AMENDED                                            │
│  │ This obligation shall not apply where this is…                    │
│                                                                      │
├──────────────────────────────────────────────────────────────────────┤
│ qwen3.8:27b  7 940 prompt  288 completion  12.1 s                    │
│                        8 searched · 11 traversed · 0 dropped ▸       │
└──────────────────────────────────────────────────────────────────────┘ ← trace
```

A claim is set in the interface's own voice and a quoted provision in a serif behind a left rule, so the two are never mistaken for each other. Every claim carries at least one citation. A claim that reached the surface with none is a contract violation rather than a layout case.

## Answered, with a moved citation

Rendered on top of the answered state whenever a cited provision was moved by the amendment.

```plaintext
│ A system used to evaluate the creditworthiness of natural persons    │
│ is high-risk, and the human underwriter at the end does not remove   │
│ that classification.                                                 │
│                                                                      │
│  ┃ Annex III(5)(b)  ( moved by the amendment )      ← rule and chip   │
│  ┃ AI systems intended to be used to evaluate the      both marked    │
│  ┃ creditworthiness of natural persons or                             │
│  ┃ establish their credit score.                    ← the Act         │
│  ┃ ──────────────────────────────────────────       ← separator       │
│  ┃ Not the Act's words: Regulation (EU) 2026/1744   ← our note about  │
│  ┃ moved the date this bites. Read against the         the Act, never │
│  ┃ original text it was 2 August 2026.                 the Act itself │
```

Copy, verbatim:

- Chip: `moved by the amendment`
- Note label: `Not the Act's words:`
- Note body is dynamic, supplied per citation.

Three layers appear inside one block and a reader has to be able to separate them without effort: the claim, the Act's own words, and our note about the Act. The note is the layer a reader is likeliest to mistake for statute, so it is fenced off by a rule and named outright rather than introduced by a neutral heading. The label is blunt on purpose.

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

A result, never a failure. It sits where an answer would sit and takes none of the failure region's treatment.

```plaintext
├──────────────────────────────────────────────────────────────────────┤
│ THE SYSTEM YOU DESCRIBED                                             │
│ We retrain the credit model on fresh repayment data every quarter.   │
│ Does that count as a substantial modification?                       │
├──────────────────────────────────────────────────────────────────────┤
│ ( THE TEXT DOES NOT SETTLE THIS )                    ← tag, not an    │
│                                                         error        │
│ The Act makes substantial modification the trigger                   │
│ and never defines the threshold, so retraining on a  ← reason        │
│ quarterly cycle sits on neither side of it.                          │
│                                                                      │
│ WHAT IS MISSING                                                      │
│ — what counts as a substantial modification                          │
│ — whether retraining on new data of the same kind                    │
│   changes the intended purpose                                       │
│                                                                      │
│ WHAT WAS READ BEFORE SAYING SO                       ← the evidence   │
│  │ Article 25(1)  AMENDED                              that separates │
│  │ Any distributor, importer, deployer or other        a refusal from │
│  │ third party shall be considered to be a…            a shrug        │
│  │ Article 6  AMENDED                                                 │
│  │ The Commission shall provide guidelines…                           │
└──────────────────────────────────────────────────────────────────────┘
```

Copy, verbatim:

- Tag: `THE TEXT DOES NOT SETTLE THIS`
- Heading: `WHAT IS MISSING`
- Heading: `WHAT WAS READ BEFORE SAYING SO`
- Reason and the missing items are dynamic.

The consulted provisions are not decoration. They carry what was retrieved and found not to answer, which is the difference between a refusal and a shrug, so a refusal that renders without them has lost its argument.

## The failure region

One region, four copy variants. Only ever one at a time. Each variant names a different next action, which is why four rather than one, and a timeout is its own variant rather than a shade of error because it is the failure where the work started and waiting longer would not have helped.

```plaintext
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │ The model or the index is not running.                         │  │
│  │ The service is up and could not reach what it needs. Start     │  │
│  │ the model and ask again.                                       │  │
│  │ correlation 8f2a-41d7                            ← quotable    │  │
│  └────────────────────────────────────────────────────────────────┘  │
```

The four, verbatim:

- `The model or the index is not running.` / `The service is up and could not reach what it needs. Start the model and ask again.`
- `The model did not answer inside the budget.` / `Waiting longer would not have helped. Narrow the description and ask again.`
- `Something went wrong that we did not expect.` / `Quote the correlation id and the log will answer.`
- `Nothing is listening on the service port.` / `The service is not running. Start it and ask again.`

The correlation id renders on the first three and not on the fourth, since nothing answered and so nothing logged one. These sentences are owned by the service seam. A change to them there is a change to this file.

## The trace

Always visible, never behind a disclosure. Cost is reported rather than buried.

```plaintext
│ qwen3.8:27b  18 420 prompt  612 completion  21.3 s                   │
│                       12 searched · 31 traversed · 7 dropped ▾       │
│ ─────────────────────────────────────────────────────────────────    │
│ searched    art_6, art_6.2, art_43, art_50, art_50.1, anx_III…       │
│ traversed   art_6.1, art_6.3, art_8, art_9, art_10  +23 more         │
│ dropped     art_19, art_20, art_21 — reached by traversal, cut by    │
│             the prompt budget, never read                            │
```

That summary line stays on screen at all times. Behind the disclosure sit three id lists, each capped at roughly eight ids and followed by a count of the rest. On the full-context arm those lists run to hundreds, and an uncapped one would swamp the answer it describes. The count carries the scale and the expansion carries the detail.

Dropped ids are named beside traversed ids and never omitted. Traversal reaches more provisions than a prompt has room for, so reporting what traversal found without reporting what the budget cut overstates what the answer actually rests on.

## Behavior

- The version toggle re-asks the current question against the other text and replaces the answer. It is a real control, not a demo affordance
- The traversal switch turns reference following off and re-asks. It exists to demonstrate the arm comparison rather than to serve a visitor, and it is labelled as a demo on screen so the layout does not pretend otherwise
- Editing the description returns the surface to its empty state with the previous text in the input
- The trace disclosure expands the three id lists in place. Nothing else on the surface opens, collapses, or overlays
- The theme control chooses between matching the system, light, and dark, and starts on matching the system. A reader who chooses nothing is decided by `prefers-color-scheme`, and a choice is remembered per browser and applied before the first paint, so the page never renders in one theme and swaps to the other
- Every state above replaces the answer region. None of them stack, except the moved-citation and cut-short states, which render on top of an answer

## Not on this surface

The reference graph is not visualized. It sits under open risks in the architecture record as depending on time remaining, and a fixed window with the evaluation not yet built does not have it. The traversal switch and the traversed-id disclosure carry the evidence that traversal happened, which is what a graph would otherwise be there to show.

There is no navigation, no account, no history, and no second screen. A visitor asks one question at a time and the surface is that question's answer.
