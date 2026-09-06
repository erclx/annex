import type { CorpusVersion } from '@/components/versions'

/**
 * The one persistent band: what this is, and the two controls that re-ask.
 *
 * No icons, per `.claude/DESIGN.md`. The version toggle is a segmented control
 * of two text labels and the traversal switch is a drawn shape, because one
 * icon invites a set and the set is a dependency this surface has no need of.
 */
export function TopBar({
  version,
  onVersionChange,
  traversal,
  onTraversalChange,
  disabled,
}: {
  version: CorpusVersion
  onVersionChange: (version: CorpusVersion) => void
  traversal: boolean
  onTraversalChange: (traversal: boolean) => void
  disabled: boolean
}) {
  return (
    <header className="border-b border-rule bg-surface">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:gap-3">
          <span className="text-[17px] font-semibold text-ink">Annex</span>
          <span className="text-[14px] leading-[1.6] text-muted">
            Which articles of the EU AI Act you have to read
          </span>
        </div>

        <div className="flex items-center gap-4">
          <div
            className="flex rounded-full border border-rule"
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

          <label className="flex items-center gap-2 text-[11.5px] text-muted">
            <input
              type="checkbox"
              checked={traversal}
              disabled={disabled}
              onChange={(event) => {
                onTraversalChange(event.target.checked)
              }}
              className="accent-accent"
            />
            <span>Follow references</span>
            <span className="rounded-full border border-rule px-1.5 py-0.5 font-mono text-[10.5px] tracking-[0.08em] uppercase">
              demo
            </span>
          </label>
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
      className={`rounded-full px-3 py-1 text-[11.5px] ${
        active ? 'bg-accent-soft font-semibold text-ink' : 'text-muted'
      } disabled:opacity-60`}
    >
      {children}
    </button>
  )
}
