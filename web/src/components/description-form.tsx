import type { ReactNode } from 'react'

import { MAXIMUM_DESCRIPTION } from '@/lib/ask'
import { group } from '@/lib/format'

export type DescriptionError = 'empty' | 'too-long'

/** Copy owned by `canon/wireframes/answer.md` § Invalid. */
const ERROR_COPY: Record<DescriptionError, string> = {
  empty: 'A description is needed before this can be answered.',
  'too-long': `The description is too long, so shorten it to ${group(MAXIMUM_DESCRIPTION)} characters or fewer.`,
}

/**
 * The empty state, and the one place a validation message renders.
 *
 * The last sentence of the supporting text is compliance work rather than tone
 * work. No label, heading, or button on this surface may imply a verdict on
 * whether an organization complies, and stating the boundary before a visitor
 * has asked anything is where `canon/wireframes/answer.md` puts it.
 *
 * `error` renders only once a submit has been tried. Raising the empty message
 * when focus merely left the box put a red line and an inactive button in
 * front of a visitor who had not asked anything yet, which the operator's
 * first-use pass recorded as F6.
 *
 * `choices` is the version and traversal row the page places here below 1024
 * pixels before anything is asked, directly under the description where the
 * choice is made, rather than in a top bar that holds only the brand there.
 */
export function DescriptionForm({
  description,
  onDescriptionChange,
  onSubmit,
  error,
  pending,
  choices,
}: {
  description: string
  onDescriptionChange: (description: string) => void
  onSubmit: () => void
  error: DescriptionError | null
  pending: boolean
  choices?: ReactNode
}) {
  const isInvalid = error !== null

  return (
    <form
      className="flex w-full flex-col gap-4 pt-6 pb-10 lg:pt-12"
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
        amended on 27 July 2026. Every claim carries the article text it came
        from, so you check the answer rather than trust it. It does not tell you
        whether you comply.
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
          aria-invalid={isInvalid}
          aria-describedby={isInvalid ? 'description-error' : undefined}
          placeholder="A customer-service chatbot that also scores loan applications…"
          className={`rounded-lg border bg-surface px-[13px] py-[11px] text-[14px] leading-[1.6] text-ink placeholder:text-muted ${
            isInvalid ? 'border-error' : 'border-rule'
          }`}
        />
        {error && (
          <p id="description-error" className="m-0 text-[13px] text-error">
            {ERROR_COPY[error]}
          </p>
        )}
      </div>

      {choices}

      <div>
        {/* Live until a submit has been tried, and held inactive while the
            message is showing, which is where the wireframe draws each.
            Nothing is saved either way: a submit the form rejects sets the
            message and never calls the service. */}
        <button
          type="submit"
          disabled={pending || isInvalid}
          className="rounded-md bg-accent px-[14px] py-[7px] text-[13px] font-medium text-paper disabled:opacity-50"
        >
          Find the articles
        </button>
      </div>
    </form>
  )
}
