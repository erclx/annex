---
title: AI Act
description: The corpus this project reads, its amended deadlines, its reference structure, and the claims that must not be made from it
---

# AI Act

## Overview

The corpus is the EU Artificial Intelligence Act, Regulation (EU) 2024/1689, as amended. It is the only body of text the system reads, and every answer traces back into it.

Two properties of the corpus drive the whole design. It is heavily cross-referenced, so the answer to a real question is rarely in the article that appears to be about it. And it moved in July 2026, so the version matters and an answer that ignores the version is wrong about dates that carry penalties.

## The amendment

The Digital Omnibus on AI is [Regulation (EU) 2026/1744](https://eur-lex.europa.eu/eli/reg/2026/1744/oj/eng). It was published in the Official Journal on 24 July 2026 and entered into force on 27 July 2026, as a matter of urgency on the third day after publication rather than the usual twentieth, because the deadline it moved was six days away.

It amends the AI Act, the EASA Regulation (EU) 2018/1139 and the Machinery Regulation (EU) 2023/1230, and it adds new prohibited practices and scope clarifications alongside the deferrals.

Legislative path: Commission proposal 19 November 2025, provisional agreement 7 May 2026, Parliament approval 16 June 2026 by 423 to 57 with 174 abstentions, [Council final approval](https://www.consilium.europa.eu/en/press/press-releases/2026/06/29/artificial-intelligence-council-gives-final-green-light-to-simplify-and-streamline-rules/) 29 June 2026.

### Deadlines, as amended

| Obligation                     | Original      | As amended                               |
| ------------------------------ | ------------- | ---------------------------------------- |
| Article 50 transparency        | 2 August 2026 | Unchanged. **Live today**                |
| Annex III standalone high-risk | 2 August 2026 | **2 December 2027**, a 16-month deferral |
| Annex I embedded high-risk     | 2 August 2027 | **2 August 2028**, a 12-month deferral   |

AI Office supervision and enforcement powers began on 2 August 2026.

## Reference structure

The Act carries its cross-references in the text, as sentences naming another article, annex or definition. That is what makes the reference graph a parsing job rather than an extraction job, and it is the property `.claude/ARCHITECTURE.md` rests the graph decision on.

The chain that matters most, and the one the traversal demo runs on. Two different things are drawn here and they do not share a route, so each arrow says which it is. Measured on 2026-09-05.

```plaintext
what a reader must read, in order:
  Article 6 (classification)
    must-read  Annex III (the high-risk list)
    must-read  Articles 8 to 15 (the obligations)
    must-read  Article 43 (conformity assessment)

what the text actually cites, which is what traversal walks:
  art_6  --cites-->  art_96  --cites-->  art_8 ... art_15
  art_6  --cites-->  art_97  --cites-->  art_43
  art_6  --cites-->  anx_III --cites-->  art_6, art_6(2)   (points back, never forward)
```

An answer to "this system is high risk, what must we do" requires reading all four of the first block. Traversal reaches every one of those destinations from Article 6 in two hops, in both versions, so the demo holds. It gets there through the guidelines and delegation articles rather than through Annex III, which cites only what classifies it.

Never read the first block as the graph. Doing exactly that is what produced a retracted finding on 2026-09-05: the route looked absent from the text, and the conclusion drawn was that nothing cites Article 8.

One measurement trap sits here, and it cost a wrong finding on 2026-09-05. `Articles 8 to 15` is a single phrase naming eight provisions, and a pattern matching `Article` followed by a space never matches the plural. Missing it drops the edges into the obligation articles entirely and makes the chain look absent from the text. A reference predicate has to expand plural and range forms before any claim about reachability is worth making.

## Document structure

The two versions are not the same document with different dates. Measured on 2026-09-05 against both live URLs.

| Property                           | Original OJ                            | Consolidated 2026-07-27                  |
| ---------------------------------- | -------------------------------------- | ---------------------------------------- |
| Article headings rendered          | 113                                    | 119                                      |
| Articles reachable at `id="art_N"` | 113                                    | 113                                      |
| Annexes                            | 13                                     | 14                                       |
| Recitals                           | 180                                    | 0                                        |
| Words, tags stripped               | 90 497                                 | 61 044                                   |
| Markup scheme                      | `oj-normal`, `oj-ti-art`, `oj-sti-art` | `norm`, `no-parag`, `title-article-norm` |
| Amendment markers                  | none                                   | 129 `p.modref` carrying `M1` and `B`     |

Four things follow, and each has already cost a wrong assumption:

- **Anchors lose six articles in the consolidated text.** Articles 4a, 60a, 75a, 75b, 75c and 75d were inserted by the amendment and carry no `id="art_N"` anchor. An anchor-driven parse folds each into the article above it and still counts 113, which looks like the two versions agreeing. Drive extraction from the rendered headings.
- **Paragraph numbers are labels rather than positions.** Article 6 reads `1, 1a, 1b, 1c, 2` through `8` in the consolidated text against `1` through `8` in the original. The `NNN.NNN` ids the original carries are sequential positions and disagree with the labels wherever a paragraph was inserted.
- **A citation resolves in both versions.** The amendment inserts `1a` rather than renumbering, so `Article 6(2)` means one thing in both texts and the set difference per article is what changed. Two readings of how far that holds, both measured at `2c74d20` on 2026-09-06 and both true of a different predicate. Comparing only the articles that carry a parsed paragraph in both versions: **94 compared, 82 identical, 12 differing**. Comparing all 113 shared articles, counting an empty set on both sides as identical: **100 identical, 13 differing**. An earlier reading of this entry gave 94 as the count of identical label sets. It is not. 94 is the number of articles carrying at least one parsed paragraph in the original, which is also the number compared under the first predicate, and that coincidence is where the figure came from.
- **The consolidated text carries no recitals.** Any answer resting on a recital reads the original, and the full-context baseline is a different size on each side.

### Three word counts, and what each one counts

The record carried three figures for one document and none of them said which predicate it answered. All three are defensible and they are not interchangeable. Measured on 2026-09-06 through the shipped loader.

| Reading                        | Original | Consolidated | What it counts                                                         |
| ------------------------------ | -------- | ------------ | ---------------------------------------------------------------------- |
| Words, tags stripped           | 90 497   | 61 044       | The rendered document, headings and tables and closing matter included |
| Words of parsed provision text | 89 825   | 60 142       | Articles, annexes and recitals as the loader yields them               |
| Words the baseline arm sends   | 90 743   | 60 541       | The above, plus each block's citation line and its bracket number      |

The middle row is the one every token figure in the record rests on: 581 082 characters of original and 384 515 of consolidated, which is what came back as 114 720 and 77 040 prompt tokens. The figure of 90 483 that `README.md`, `.claude/REQUIREMENTS.md` and `.claude/ARCHITECTURE.md` carry is the Act's own commonly quoted length and answers none of these three predicates exactly. It is kept because it is what a reader outside the project recognizes, and it is never the denominator of anything computed here.

### What the full-context arm actually sends

| Property                      | Original | Consolidated |
| ----------------------------- | -------- | ------------ |
| Provisions stuffed            | 306      | 133          |
| Characters of numbered corpus | 586 231  | 386 655      |
| Prompt tokens as sent         | 118 063  | 78 406       |

The token row is `usage.prompt_tokens` read back off `annex-longctx`, and it counts the whole prompt: the numbered corpus, the synthesis instructions around it, and the question. It is therefore slightly above the 114 720 and 77 040 the record carries for the provision text alone, and the two answer different predicates rather than disagreeing.

Provisions rather than every addressable id, because an article's parsed text already contains its paragraphs and stuffing both would send the Act twice. That is 306 of the 806 ids the original addresses and 133 of the 685 in the consolidated, which is also why the baseline's retrieval precision is near zero by construction rather than by failure.

## What this project does not claim

These bound the output text itself, not only the documentation.

- **No compliance verdict.** The system reports which articles a reader has to read. It never states whether anyone complies, and no phrasing implying a verdict ships.
- **No untraceable claim.** Every factual statement about the Act carries the article or annex it came from and the text supporting it. A claim that cannot be grounded in retrieved text is dropped rather than softened.
- **No answer where the text is silent.** A question the text does not settle returns a refusal naming what is missing.
- **No version-blind date.** Any answer touching a deadline states which version of the text it came from.

## Known unsettled questions

Useful because they are the worked examples for the refusal path rather than edge cases invented for it.

- **Grandfathering.** Systems already on the market before the amended deadlines fall outside full high-risk compliance unless later substantially modified. No regulator has defined that threshold, so the text does not settle it.

## Do not quote

- **The reprieve for machine-readable marking** of content from systems already on the market. Published sources disagree on the figure because it moved between the Commission proposal and the adopted text. Do not state a number for it from any secondary source. Read the adopted regulation or say nothing.
