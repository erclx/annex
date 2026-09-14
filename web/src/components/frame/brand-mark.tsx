/**
 * The project's mark, drawn inline so it takes the theme the way every other
 * element on the surface does.
 *
 * The geometry is the same three edges and four nodes as `web/public/favicon.svg`,
 * on its 100-unit viewBox. The favicon hardcodes the light theme's ink and
 * accent because a browser loads it before any stylesheet, where this one reads
 * `currentColor` for the ink, the accent token for the one accented node, and
 * the surface token for the hollow nodes, so it holds on either ground.
 */
export function BrandMark({ size = 20 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      aria-hidden="true"
      className="shrink-0 text-ink"
    >
      <line
        x1="22"
        y1="76"
        x2="50"
        y2="24"
        stroke="currentColor"
        strokeWidth="6"
      />
      <line
        x1="50"
        y1="24"
        x2="78"
        y2="56"
        stroke="currentColor"
        strokeWidth="6"
      />
      <line
        x1="50"
        y1="24"
        x2="78"
        y2="16"
        stroke="currentColor"
        strokeWidth="6"
      />
      <circle
        cx="22"
        cy="76"
        r="12"
        className="fill-surface"
        stroke="currentColor"
        strokeWidth="6"
      />
      <circle cx="50" cy="24" r="13" fill="currentColor" />
      <circle
        cx="78"
        cy="56"
        r="11"
        className="fill-surface stroke-accent"
        strokeWidth="6"
      />
      <circle
        cx="78"
        cy="16"
        r="9"
        className="fill-surface"
        stroke="currentColor"
        strokeWidth="5"
      />
    </svg>
  )
}
