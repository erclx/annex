// Generated from python/schema/stream-node.schema.json by `bun run generate:answer`.
// Do not edit. `web/scripts/verify.sh` fails when this file and the schema disagree.
import { z } from 'zod'

export const streamNodeSchema = z
  .object({
    dropped_ids: z.union([z.array(z.string()), z.null()]).default(null),
    edges: z
      .union([
        z.array(
          z
            .object({
              hop: z.number().int(),
              source_id: z.string(),
              target_id: z.string(),
            })
            .strict()
            .describe(
              "One edge the walk took, from the provision it came from to the one it reached.\n\n`hop` is the target's distance from a seed. Every edge here is the one the\nwalk actually took to first reach `target_id`, not every reference between\nthe two provisions, which is what lets a drawing lay a traversed provision\nout at exactly one point without choosing among the citations that reach\nit.",
            ),
        ),
        z.null(),
      ])
      .default(null),
    node: z.string(),
    searched_ids: z.union([z.array(z.string()), z.null()]).default(null),
    supplied_ids: z.union([z.array(z.string()), z.null()]).default(null),
    traversed_ids: z.union([z.array(z.string()), z.null()]).default(null),
  })
  .strict()
  .describe(
    'One `event: node` frame, naming the graph node that just completed.\n\nEach optional field is present only on the frame of the node that produced\nit, so a reader can tell "this node reached nothing" from "this node does\nnot report that". Ids rather than text throughout: the page resolves an id\nagainst the corpus export it already ships, and statute text on every frame\nwould repeat what the terminal `answer` frame carries anyway.\n\n`supplied_ids` keeps the prompt\'s own order and repeats, since a provision\nreached by both search and the walk is numbered twice in the prompt. A\nreader showing them deduplicates for display.',
  )
export type StreamNode = z.infer<typeof streamNodeSchema>
