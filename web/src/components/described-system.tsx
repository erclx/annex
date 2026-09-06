/**
 * The band naming what was asked, carried across every state after the empty one.
 *
 * Editing returns the surface to its empty state with the previous text still
 * in the input, which is why this offers a control rather than only a label.
 */
export function DescribedSystem({
  description,
  onEdit,
}: {
  description: string
  onEdit?: () => void
}) {
  return (
    <section className="border-b border-rule-soft">
      <div className="mx-auto w-full max-w-4xl px-6 py-6">
        <h2 className="mb-[7px] font-mono text-[10.5px] tracking-[0.08em] text-muted uppercase">
          The system you described
        </h2>
        <p className="m-0 text-[15px] leading-[1.5] text-ink">{description}</p>
        {onEdit && (
          <button
            type="button"
            onClick={onEdit}
            className="mt-2 inline-block text-[12px] text-accent"
          >
            Edit description
          </button>
        )}
      </div>
    </section>
  )
}
