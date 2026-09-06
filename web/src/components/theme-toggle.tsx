'use client'

import { useSyncExternalStore } from 'react'

const STORAGE_KEY = 'annex-theme'

export type ThemeChoice = 'system' | 'light' | 'dark'

/**
 * Three marks drawn inline rather than pulled from an icon set.
 *
 * `.claude/DESIGN.md` bans an icon library outright and permits a drawn shape,
 * which is what the traversal switch already is. These are the same kind of
 * mark: three paths in the file that uses them, no package, nothing added to
 * the manifest. They carry `aria-hidden` because the button they sit in is
 * labelled in words.
 */
function Mark({ choice }: { choice: ThemeChoice }) {
  const common = {
    width: 13,
    height: 13,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  }

  if (choice === 'light')
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
      </svg>
    )

  if (choice === 'dark')
    return (
      <svg {...common}>
        <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
      </svg>
    )

  return (
    <svg {...common}>
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <path d="M8 21h8M12 17v4" />
    </svg>
  )
}

const LABEL: Record<ThemeChoice, string> = {
  system: 'Match system',
  light: 'Light',
  dark: 'Dark',
}

const ORDER: ThemeChoice[] = ['system', 'light', 'dark']

function apply(choice: ThemeChoice) {
  const root = document.documentElement
  if (choice === 'system') delete root.dataset.theme
  else root.dataset.theme = choice
}

function stored(): ThemeChoice {
  try {
    const value = localStorage.getItem(STORAGE_KEY)
    return value === 'light' || value === 'dark' ? value : 'system'
  } catch {
    return 'system'
  }
}

/**
 * The stored choice is external state, so it is read through a store rather
 * than copied into React state by an effect.
 *
 * `.claude/rules/canon/framework/200-react.md` forbids syncing derived state in
 * an effect and names this as the alternative. It also buys cross-tab sync for
 * free: the `storage` event fires in every other tab, and this tab's own writes
 * notify through the listener set, since `storage` does not fire in the tab that
 * wrote.
 */
const listeners = new Set<() => void>()

function subscribe(onChange: () => void) {
  listeners.add(onChange)
  window.addEventListener('storage', onChange)
  return () => {
    listeners.delete(onChange)
    window.removeEventListener('storage', onChange)
  }
}

/** The server cannot read the reader's store, so it renders the OS default. */
function serverSnapshot(): ThemeChoice {
  return 'system'
}

/**
 * Applies the choice to the document first and stores it best-effort behind.
 *
 * A private window and a browser set to block site data both accept the write
 * and keep nothing, so the surface stays correct either way and the choice is
 * simply not remembered next visit.
 */
export function ThemeToggle() {
  const choice = useSyncExternalStore(subscribe, stored, serverSnapshot)

  function choose(next: ThemeChoice) {
    apply(next)
    try {
      if (next === 'system') localStorage.removeItem(STORAGE_KEY)
      else localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // Nothing to recover. The document already carries the choice.
    }
    listeners.forEach((notify) => {
      notify()
    })
  }

  return (
    <div
      className="flex overflow-hidden rounded-md border border-rule"
      role="group"
      aria-label="Theme"
    >
      {ORDER.map((option) => (
        <button
          key={option}
          type="button"
          aria-pressed={choice === option}
          aria-label={LABEL[option]}
          title={LABEL[option]}
          onClick={() => {
            choose(option)
          }}
          className={`flex items-center px-[7px] py-[5px] ${
            choice === option ? 'bg-accent text-paper' : 'text-muted'
          }`}
        >
          <Mark choice={option} />
        </button>
      ))}
    </div>
  )
}
