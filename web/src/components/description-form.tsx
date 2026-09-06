/**
 * The empty state, and the one place a validation message renders.
 *
 * The last sentence of the supporting text is compliance work rather than tone
 * work. No label, heading, or button on this surface may imply a verdict on
 * whether an organization complies, and stating the boundary before a visitor
 * has asked anything is where `.claude/wireframes/answer.md` puts it.
 */
export function DescriptionForm({
  description,
  onDescriptionChange,
  onBlur,
  onSubmit,
  invalid,
  pending,
}: {
  description: string
  onDescriptionChange: (description: string) => void
  onBlur: () => void
  onSubmit: () => void
  invalid: boolean
  pending: boolean
}) {
  return (
    <form
      className="mx-auto flex w-full max-w-4xl flex-col gap-4 px-6 py-16"
      onSubmit={(event) => {
        event.preventDefault()
        onSubmit()
      }}
    >
      <h1 className="m-0 max-w-[34ch] text-[26px] leading-[1.35] font-semibold text-ink">
        Describe what you are building. You get back the articles you have to
        read.
      </h1>

      <p className="m-0 max-w-[62ch] text-[14px] leading-[1.6] text-muted">
        Plain language is enough. Annex reports which provisions apply and
        quotes them, against your choice of the original text or the text as
        amended on 27 July 2026. It does not tell you whether you comply.
      </p>

      <div className="flex max-w-[62ch] flex-col gap-2">
        <label htmlFor="description" className="sr-only">
          Describe your system
        </label>
        <textarea
          id="description"
          value={description}
          rows={3}
          onChange={(event) => {
            onDescriptionChange(event.target.value)
          }}
          onBlur={onBlur}
          aria-invalid={invalid}
          aria-describedby={invalid ? 'description-error' : undefined}
          placeholder="A customer-service chatbot that also scores loan applications…"
          className={`rounded-lg border bg-surface px-[13px] py-[11px] text-[14px] leading-[1.6] text-ink placeholder:text-muted ${
            invalid ? 'border-error' : 'border-rule'
          }`}
        />
        {invalid && (
          <p id="description-error" className="m-0 text-[13px] text-error">
            A description is needed before this can be answered.
          </p>
        )}
      </div>

      <div>
        {/* Live on an empty description and held inactive once the message is
            showing, which is where the wireframe draws each. Nothing is saved
            either way: an empty submit sets the message and never calls the
            service. */}
        <button
          type="submit"
          disabled={pending || invalid}
          className="rounded-md bg-accent px-[14px] py-[7px] text-[13px] font-medium text-paper disabled:opacity-50"
        >
          Find the articles
        </button>
      </div>
    </form>
  )
}
