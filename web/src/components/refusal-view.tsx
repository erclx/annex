import { CitationBlock } from '@/components/citation-block'
import type { Refusal } from '@/components/versions'

/**
 * A result, never a failure.
 *
 * It sits where an answer would sit and takes none of the failure region's
 * treatment, because refusing where the text does not settle a question is the
 * product's argument rather than a fault in it. The tag is slate rather than
 * red for the same reason.
 *
 * The consulted provisions are not decoration. They carry what was retrieved
 * and found not to answer, which is the difference between a refusal and a
 * shrug, so a refusal rendering without them has lost its argument.
 */
export function RefusalView({ refusal }: { refusal: Refusal }) {
  return (
    <section className="py-6">
      <span className="mb-4 inline-block rounded-full border border-refusal-rule bg-refusal-surface px-[10px] py-[3px] font-mono text-[10.5px] tracking-[0.08em] text-refusal uppercase">
        The text does not settle this
      </span>

      <p className="m-0 mb-6 max-w-[70ch] text-[17px] leading-[1.5] text-ink">
        {refusal.reason}
      </p>

      <h2 className="mb-2 font-mono text-[10.5px] font-medium tracking-[0.08em] text-muted uppercase">
        What is missing
      </h2>
      <ul className="mb-6 list-none p-0">
        {refusal.missing.map((item) => (
          <li
            key={item}
            className="relative mb-[5px] pl-[18px] text-[14px] leading-[1.55] text-ink before:absolute before:left-0 before:text-muted before:content-['—']"
          >
            {item}
          </li>
        ))}
      </ul>

      <h2 className="mb-2 font-mono text-[10.5px] font-medium tracking-[0.08em] text-muted uppercase">
        What was read before saying so
      </h2>
      <div>
        {refusal.consulted.map((citation) => (
          <CitationBlock key={citation.provision_id} citation={citation} />
        ))}
      </div>
    </section>
  )
}
