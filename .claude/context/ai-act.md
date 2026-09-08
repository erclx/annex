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

An answer to "this system is high risk, what must we do" requires walking all four. Semantic search over passages reaches one of them at a time, which is why traversal is load-bearing rather than decorative.

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
