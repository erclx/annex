import { ThemeToggle } from '@/components/theme-toggle'
import type { CorpusVersion } from '@/components/versions'

/**
 * The one persistent band: what this is, and the two controls that re-ask.
 *
 * Drawn against the settled design rather than invented. The version control is
 * a segmented pair whose active half is filled with the accent, and the
 * traversal control is a drawn switch rather than a checkbox, per the
 * iconography rule in `.claude/DESIGN.md`: no icons and no icon library, so a
 * switch is a shape this file draws.
 *
 * `traversalFixed` is the deployed build's case. That build replays a capture
 * taken with reference following on, so both positions of the switch would
 * return one answer. It is held inactive and relabelled rather than removed,
 * because the version control beside it does still re-ask and a missing switch
 * would read as a surface that never had one.
 *
 * The repository and evaluation links sit here rather than on the empty state
 * alone, so a reader who reaches an answer or a refusal, the moment most
 * likely to prompt checking the source, can still reach it without editing
 * back to a blank form.
 */
const REPOSITORY_URL = 'https://github.com/erclx/annex'
const EVALUATION_URL =
  'https://github.com/erclx/annex/blob/main/docs/evaluation.md'
export function TopBar({
  version,
  onVersionChange,
  traversal,
  onTraversalChange,
  disabled,
  traversalFixed = false,
}: {
  version: CorpusVersion
  onVersionChange: (version: CorpusVersion) => void
  traversal: boolean
  onTraversalChange: (traversal: boolean) => void
  disabled: boolean
  traversalFixed?: boolean
}) {
  return (
    <header className="border-b border-rule bg-surface">
      <div className="flex w-full flex-wrap items-center justify-between gap-4 px-6 py-4 lg:px-8">
        <div className="flex items-baseline gap-2">
          <b className="text-[16px] font-semibold tracking-[-0.01em] text-ink">
            Annex
          </b>
          <span className="text-[12px] text-muted">
            Which articles of the EU AI Act you have to read
          </span>
        </div>

        <div className="flex items-center gap-4">
          <nav className="flex items-center gap-3 text-[12px]">
            <a href={REPOSITORY_URL} className="text-accent hover:underline">
              Repository
            </a>
            <a href={EVALUATION_URL} className="text-accent hover:underline">
              Evaluation
            </a>
          </nav>

          <div
            className="flex overflow-hidden rounded-md border border-rule bg-transparent"
            role="group"
            aria-label="Which text to read against"
          >
            <VersionButton
              active={version === 'original'}
              disabled={disabled}
              onClick={() => {
                onVersionChange('original')
              }}
            >
              Original
            </VersionButton>
            <VersionButton
              active={version === 'consolidated'}
              disabled={disabled}
              onClick={() => {
                onVersionChange('consolidated')
              }}
            >
              Amended 27 Jul 2026
            </VersionButton>
          </div>

          <div className="flex items-center gap-[7px] text-[12px] text-muted">
            <button
              type="button"
              role="switch"
              aria-checked={traversal}
              aria-label="Reference traversal"
              disabled={disabled || traversalFixed}
              title={
                traversalFixed
                  ? 'The recording holds one answer a question, taken with reference following on.'
                  : undefined
              }
              onClick={() => {
                onTraversalChange(!traversal)
              }}
              className={`relative h-[17px] w-[30px] shrink-0 rounded-full disabled:opacity-60 ${
                traversal ? 'bg-accent' : 'bg-rule'
              }`}
            >
              <span
                className={`absolute top-[2px] size-[13px] rounded-full bg-paper ${
                  traversal ? 'right-[2px]' : 'left-[2px]'
                }`}
              />
            </button>
            <span>Reference traversal</span>
            <span className="rounded-[3px] border border-dashed border-rule px-[5px] py-px font-mono text-[9.5px] tracking-[0.06em] uppercase">
              {traversalFixed ? 'recorded' : 'demo'}
            </span>
          </div>

          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}

function VersionButton({
  active,
  disabled,
  onClick,
  children,
}: {
  active: boolean
  disabled: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
      className={`px-[11px] py-[5px] text-[12px] disabled:opacity-60 ${
        active ? 'bg-accent text-paper' : 'text-muted'
      }`}
    >
      {children}
    </button>
  )
}
