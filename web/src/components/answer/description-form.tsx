import type { ReactNode } from 'react'

import { group } from '@/lib/browser/format'
import { MAXIMUM_DESCRIPTION } from '@/lib/service/ask'

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
 * `choices` is the version and traversal row, held in the composer's footer at
 * every width beside the send action, so the choice is made in the same box as
 * the description it applies to. The operator's second-use pass picked that
 * composer over a plain field with the choices outside it.
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
        Describe your AI system. Get back the articles of the AI Act you need to
        read.
      </h1>

      <p className="m-0 max-w-[62ch] text-[14px] leading-[1.6] text-muted">
        Write it the way you&apos;d explain it to a colleague. Annex finds the
        provisions that apply and quotes each one, so you can check every claim
        against the law itself. Read against the Act as published or as amended
        on 27 July 2026. It won&apos;t tell you whether you comply.
      </p>

      <div className="flex flex-col gap-2">
        <div
          data-testid="composer"
          className={`flex flex-col gap-3 rounded-[14px] border bg-surface px-4 pt-3 pb-3 shadow-[0_1px_2px_rgb(0_0_0/0.04)] ${
            isInvalid ? 'border-error' : 'border-rule focus-within:border-muted'
          }`}
        >
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
            className="w-full resize-none bg-transparent text-[14px] leading-[1.6] text-ink placeholder:text-muted outline-none"
          />

          <div className="flex flex-col items-start gap-x-3 gap-y-2 lg:flex-row lg:flex-wrap lg:items-center">
            {choices}

            {/* Live until a submit has been tried, and held inactive while the
                message is showing, which is where the wireframe draws each.
                Nothing is saved either way: a submit the form rejects sets the
                message and never calls the service. */}
            <button
              type="submit"
              disabled={pending || isInvalid}
              className="inline-flex items-center gap-[6px] rounded-full bg-accent px-4 py-[7px] text-[13px] font-medium text-paper disabled:cursor-not-allowed disabled:opacity-50 lg:ml-auto"
            >
              Find the articles
              <span aria-hidden="true">→</span>
            </button>
          </div>
        </div>

        {error && (
          <p id="description-error" className="m-0 text-[13px] text-error">
            {ERROR_COPY[error]}
          </p>
        )}
      </div>
    </form>
  )
}
