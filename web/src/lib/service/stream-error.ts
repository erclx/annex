// Generated from python/schema/stream-error.schema.json by `bun run generate:answer`.
// Do not edit. `web/scripts/verify.sh` fails when this file and the schema disagree.
import { z } from 'zod'

export const streamErrorSchema = z
  .object({
    correlationId: z.union([z.string(), z.null()]).default(null),
    detail: z.string(),
    state: z.enum(['invalid', 'unavailable', 'timeout', 'failed']),
  })
  .strict()
  .describe(
    "The one `event: error` frame a stream ends on when a call fails mid-run.\n\nMirrors `ServiceError`'s shape, correlation id included. `bound_and_identify`\nnever sees a failure raised inside a `StreamingResponse` body, so the id\nthat reaches this frame is the one the route read before it started\nstreaming, logged separately by whatever raises inside `build_stream`.",
  )
export type StreamError = z.infer<typeof streamErrorSchema>
