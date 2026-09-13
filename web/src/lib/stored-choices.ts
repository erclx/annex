import {
  COLUMN_MAX,
  COLUMN_MIN,
  COLUMN_STORAGE_KEY,
  COLUMN_WIDTH_PROPERTY,
} from '@/lib/column-bounds'

/**
 * Applied before first paint, which is why it is a raw script rather than an effect.
 *
 * An effect runs after hydration, so the page would paint in the system theme
 * and then swap to the reader's choice, which is the flash
 * `.claude/rules/canon/ui/430-ux-completeness.md` forbids. Reading
 * `localStorage` here is synchronous and lands before the first paint.
 *
 * A reader who has chosen nothing gets no attribute, and the media query in
 * `globals.css` decides. That is what keeps the system setting the default
 * rather than a stored value nobody set.
 *
 * The answer column's stored width lands the same way, clamped to the bounds
 * `use-column-width.ts` clamps to, and read from the same module, so the grid
 * and the handle never disagree about an out-of-range value.
 */
export const APPLY_STORED_CHOICES = `
try {
  var t = localStorage.getItem('annex-theme')
  if (t === 'light' || t === 'dark') document.documentElement.dataset.theme = t
} catch (e) {}
try {
  var r = localStorage.getItem('${COLUMN_STORAGE_KEY}')
  var w = Number(r)
  if (r !== null && isFinite(w)) document.documentElement.style.setProperty('${COLUMN_WIDTH_PROPERTY}', Math.round(Math.min(${COLUMN_MAX}, Math.max(${COLUMN_MIN}, w))) + 'px')
} catch (e) {}
`
