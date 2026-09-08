import { type CorpusVersion, VERSION_LABEL } from '@/components/versions'

/**
 * The wait, drawn as the shape of the result rather than as a spinner.
 *
 * The skeleton takes claim and citation proportions so the wait previews what
 * arrives. The stated range is drawn from measured warm runs and belongs in the
 * copy, because a number tells a reader more than movement does. Nothing here
 * animates, per `.claude/DESIGN.md`.
 */
export function LoadingAnswer({ version }: { version: CorpusVersion }) {
  return (
    <div className="py-6" role="status">
      <div className="flex flex-col gap-2">
        <div className="h-3 w-full rounded bg-rule-soft" />
        <div className="h-3 w-2/3 rounded bg-rule-soft" />
      </div>

      <div className="mt-5 flex flex-col gap-2 border-l-2 border-rule pl-4">
        <div className="h-2.5 w-5/6 rounded bg-rule-soft" />
        <div className="h-2.5 w-3/4 rounded bg-rule-soft" />
      </div>

      <p className="mt-6 text-[14px] leading-[1.6] text-muted">
        Reading {VERSION_LABEL[version]}. Usually around 20 to 30 seconds.
      </p>
    </div>
  )
}
