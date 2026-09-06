// Generated from python/schema/answer.schema.json by `bun run generate:answer`.
// Do not edit. `web/scripts/verify.sh` fails when this file and the schema disagree.
import { z } from 'zod'

export const answerSchema = z
  .object({
    claims: z
      .array(
        z
          .object({
            citations: z.array(
              z
                .object({
                  change_note: z.union([z.string(), z.null()]).default(null),
                  changed: z.boolean().default(false),
                  citation: z.string(),
                  kind: z
                    .enum(['article', 'annex', 'recital', 'paragraph'])
                    .describe('What sort of unit a provision is.'),
                  provision_id: z.string(),
                  text: z.string(),
                  version: z
                    .enum(['original', 'consolidated'])
                    .describe(
                      'Which of the two texts a provision was read from.',
                    ),
                })
                .strict()
                .describe(
                  'One provision, quoted, located, and marked if the amendment moved it.',
                ),
            ),
            statement: z.string(),
          })
          .strict()
          .describe(
            'One statement about the described system, and what it rests on.\n\nA claim reaching verification with nothing behind it is dropped rather than\nsoftened, so emptiness is rejected by the schema rather than left to a\nconvention each caller remembers separately.',
          ),
      )
      .default([]),
    question: z.string(),
    refusal: z
      .union([
        z
          .object({
            consulted: z
              .array(
                z
                  .object({
                    change_note: z.union([z.string(), z.null()]).default(null),
                    changed: z.boolean().default(false),
                    citation: z.string(),
                    kind: z
                      .enum(['article', 'annex', 'recital', 'paragraph'])
                      .describe('What sort of unit a provision is.'),
                    provision_id: z.string(),
                    text: z.string(),
                    version: z
                      .enum(['original', 'consolidated'])
                      .describe(
                        'Which of the two texts a provision was read from.',
                      ),
                  })
                  .strict()
                  .describe(
                    'One provision, quoted, located, and marked if the amendment moved it.',
                  ),
              )
              .default([]),
            missing: z.array(z.string()),
            reason: z.string(),
          })
          .strict()
          .describe(
            'What the text does not settle, and what was read before saying so.\n\n`consulted` is what separates a refusal from a shrug. It carries the\nprovisions retrieved and found not to answer the question, so the refusal\nis evidenced rather than asserted.',
          ),
        z.null(),
      ])
      .default(null),
    retrieval: z
      .object({
        completion_tokens: z.number().int().default(0),
        dropped_ids: z.array(z.string()).default([]),
        duration_ms: z.number().int().default(0),
        model: z.string().default(''),
        prompt_tokens: z.number().int().default(0),
        searched_ids: z.array(z.string()).default([]),
        traversal_enabled: z.boolean().default(false),
        traversed_ids: z.array(z.string()).default([]),
        truncated: z.boolean().default(false),
      })
      .strict()
      .describe(
        "What the pipeline did to produce an answer, and what it cost.\n\nHeld on the answer rather than beside it. The evaluation harness scores hit\nrate and cost per question from this object, and a trace that travels\nseparately from the answer it describes is a trace something eventually\nmismatches.\n\n`dropped_ids` is the part a scorer cannot infer. Retrieval reaches more\nprovisions than a prompt has room for, so `traversed_ids` names what\ntraversal found and `dropped_ids` names which of those the budget cut\nbefore the model saw them. Scoring traversal's contribution against the\nfirst without subtracting the second credits it for text nothing read. Ids\nrather than a count, because the scorer resolves them.\n\n`truncated` says the model stopped for want of room rather than because it\nhad finished. A cut answer reads as a complete one, so a caller that does\nnot check this field cannot tell them apart.",
      )
      .default({
        completion_tokens: 0,
        dropped_ids: [],
        duration_ms: 0,
        model: '',
        prompt_tokens: 0,
        searched_ids: [],
        traversal_enabled: false,
        traversed_ids: [],
        truncated: false,
      }),
    version: z
      .enum(['original', 'consolidated'])
      .describe('Which of the two texts a provision was read from.'),
  })
  .strict()
  .describe(
    'A question, and either what the Act says about it or why it cannot say.\n\nClaims and a refusal are exclusive in both directions. An answer carrying\nboth is a pipeline that refused and answered anyway, and one carrying\nneither is a pipeline that returned nothing while reporting success.',
  )
export type Answer = z.infer<typeof answerSchema>
