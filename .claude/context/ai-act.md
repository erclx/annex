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

The chain that matters most, and the one the traversal demo runs on:

```plaintext
Article 6 (classification) -> Annex III (the high-risk list) -> Articles 8 to 15 (the obligations) -> Article 43 (conformity assessment)
```

An answer to "this system is high risk, what must we do" requires reading all four.

**The destinations are reachable, the drawn route is not, measured on 2026-09-05.** Traversal over parsed citations reaches all eight obligation articles and Article 43 from Article 6 in two hops, so the chain is walkable. It does not walk through Annex III. That annex cites only Article 6 and Article 6(2), pointing back at what classifies it rather than forward at what follows. The real paths run `art_6 -> art_96 -> art_8`, `art_6 -> art_96 -> art_15` and `art_6 -> art_97 -> art_43`, through the delegation and committee articles.

Read the arrow above as "and then you must read", not as "cites". The reachability is what matters for traversal, and it holds.

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
- **A citation resolves in both versions.** 94 of 113 articles carry identical paragraph label sets, and the amendment inserts `1a` rather than renumbering, so `Article 6(2)` means one thing in both texts and the set difference per article is what changed.
- **The consolidated text carries no recitals.** Any answer resting on a recital reads the original, and the full-context baseline is a different size on each side.

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
