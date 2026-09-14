import { recordedQuestions } from '@/lib/service/replay'

export type NextStepState = 'unrecorded' | 'unavailable' | 'unreachable'

/**
 * What the pane offers beside a state a reader can act on from here.
 *
 * Picked in the operator's first-use pass as L7, arm 2, over leaving the right
 * half of a 1280 screen empty, keeping the pane as it stood before the ask, and
 * one wide card with no pane. An unrecorded description gets the twelve
 * recorded questions as picks. A service failure gets the commands that start
 * what is missing, which match the local stack table in
 * `canon/context/development.md` and have to move with it.
 *
 * A timeout and an unexpected failure get neither, since no pick or command
 * answers either: the page keeps the terms beside those instead.
 *
 * The list scrolls inside the pane, so the twelve questions never push the
 * page past the answer column.
 */
export function FailureNextStep({
  state,
  onPick,
}: {
  state: NextStepState
  onPick: (description: string) => void
}) {
  return (
    <aside
      aria-label="Next step"
      className="sticky top-[var(--annex-bar-height,0px)] flex h-[calc(100vh-var(--annex-bar-height,0px))] flex-col border-l border-rule bg-surface"
    >
      <div className="flex-1 overflow-y-auto px-5 py-4">
        {state === 'unrecorded' ? (
          <>
            <span className="mb-2 block text-[10.5px] text-muted">
              Recorded questions you can open
            </span>
            <div className="flex flex-col">
              {recordedQuestions.map((question) => (
                <button
                  key={question.id}
                  type="button"
                  onClick={() => {
                    onPick(question.description)
                  }}
                  className="w-full border-b border-rule-soft py-[6px] text-left text-[13px] leading-[1.5] text-ink hover:text-accent"
                >
                  {question.description}
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            <span className="mb-2 block text-[10.5px] text-muted">
              Start what is missing
            </span>
            <Command label="The model" command="ollama serve" />
            <Command
              label="The service, from python/"
              command="uv run python -m annex serve"
            />
            <p className="m-0 text-[12px] text-muted">
              Then ask the same description again. Nothing you typed is lost.
            </p>
          </>
        )}
      </div>
    </aside>
  )
}

function Command({ label, command }: { label: string; command: string }) {
  return (
    <div className="mt-2 mb-[14px]">
      <span className="text-[12px] text-ink">{label}</span>
      <code className="mt-1 block rounded-md border border-rule bg-paper px-[10px] py-2 font-mono text-[12px] text-ink">
        {command}
      </code>
    </div>
  )
}
