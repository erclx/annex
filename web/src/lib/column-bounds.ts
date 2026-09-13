export const COLUMN_STORAGE_KEY = 'annex-column-width'
export const COLUMN_MIN = 480
export const COLUMN_MAX = 760
export const COLUMN_DEFAULT = 640

/**
 * Where the layout reads the width from. The pre-paint script in
 * `stored-choices.ts` writes the stored value here before the page draws, and
 * every change lands here too, so the columns never render at one width and
 * move to another.
 */
export const COLUMN_WIDTH_PROPERTY = '--annex-answer-width'

/**
 * Carries no client directive, because the server layout's pre-paint script
 * interpolates these bounds and a value imported through a client module
 * reaches a server component as a reference rather than as the number.
 */
export function clampColumnWidth(width: number): number {
  return Math.round(Math.min(COLUMN_MAX, Math.max(COLUMN_MIN, width)))
}
