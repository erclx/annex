import { CitationBlock } from '@/components/citation-block'
import type { Refusal } from '@/components/versions'

/**
 * A result, never a failure.
 *
 * It sits where an answer would sit and takes none of the failure region's
 * treatment, because refusing where the text does not settle a question is the
 * product's argument rather than a fault in it.
 *
 * The consulted provisions are not decoration. They carry what was retrieved
 * and found not to answer, which is the difference between a refusal and a
 * shrug, so a refusal rendering without them has lost its argument.
 */
export function RefusalView({ refusal }: { refusal: Refusal }) {
  return (
    <section className="py-5">
      <span className="inline-block rounded-full bg-refusal-surface px-3 py-1 font-mono text-[10.5px] tracking-[0.08em] text-refusal uppercase">
        The text does not settle this
      </span>

      <p className="mt-4 text-[15.5px] leading-[1.55] text-ink">
        {refusal.reason}
      </p>

      <h2 className="mt-6 font-mono text-[10.5px] tracking-[0.08em] text-muted uppercase">
        What is missing
      </h2>
      <ul className="mt-2 flex flex-col gap-1">
        {refusal.missing.map((item) => (
          <li key={item} className="text-[14px] leading-[1.6] text-ink">
            {item}
          </li>
        ))}
      </ul>

      <h2 className="mt-6 font-mono text-[10.5px] tracking-[0.08em] text-muted uppercase">
        What was read before saying so
      </h2>
      <div className="mt-2">
        {refusal.consulted.map((citation) => (
          <CitationBlock key={citation.provision_id} citation={citation} />
        ))}
      </div>
    </section>
  )
}
