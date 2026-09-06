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
    <section className="border-b border-rule bg-surface">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-1 px-6 py-4">
        <h2 className="font-mono text-[10.5px] tracking-[0.08em] text-muted uppercase">
          The system you described
        </h2>
        <p className="text-[14px] leading-[1.6] text-ink">{description}</p>
        {onEdit && (
          <button
            type="button"
            onClick={onEdit}
            className="self-start text-[14px] text-accent underline"
          >
            Edit description
          </button>
        )}
      </div>
    </section>
  )
}
