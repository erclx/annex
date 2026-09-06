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
      className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-6 py-16"
      onSubmit={(event) => {
        event.preventDefault()
        onSubmit()
      }}
    >
      <h1 className="max-w-md text-[26px] leading-[1.35] font-semibold text-ink">
        Describe what you are building. You get back the articles you have to
        read.
      </h1>

      <p className="max-w-md text-[14px] leading-[1.6] text-muted">
        Plain language is enough. Annex reports which provisions apply and
        quotes them, against your choice of the original text or the text as
        amended on 27 July 2026. It does not tell you whether you comply.
      </p>

      <div className="flex max-w-md flex-col gap-2">
        <label htmlFor="description" className="sr-only">
          Describe your system
        </label>
        <textarea
          id="description"
          value={description}
          rows={4}
          onChange={(event) => {
            onDescriptionChange(event.target.value)
          }}
          onBlur={onBlur}
          aria-invalid={invalid}
          aria-describedby={invalid ? 'description-error' : undefined}
          placeholder="A customer-service chatbot that also scores loan applications…"
          className={`rounded-lg border bg-surface px-3 py-2 text-[14px] leading-[1.6] text-ink placeholder:text-muted ${
            invalid ? 'border-error' : 'border-rule'
          }`}
        />
        {invalid && (
          <p id="description-error" className="text-[14px] text-error">
            A description is needed before this can be answered.
          </p>
        )}
      </div>

      <div>
        {/* Live on an empty description and held inactive once the message is
            showing, which is where the wireframe draws each. Nothing is saved
            either way: an empty submit sets the message and never calls the
            service. A button disabled on arrival would leave a visitor who
            pressed it with no message and no reason. */}
        <button
          type="submit"
          disabled={pending || invalid}
          className="rounded-lg bg-accent px-4 py-2 text-[14px] font-medium text-surface disabled:opacity-50"
        >
          Find the articles
        </button>
      </div>
    </form>
  )
}
