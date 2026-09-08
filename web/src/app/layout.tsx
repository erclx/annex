import './globals.css'

import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Annex',
  description:
    'Describe an AI system in plain language and get back the articles of the EU AI Act you have to read, quoted and located.',
}

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
 */
const APPLY_THEME = `
try {
  var t = localStorage.getItem('annex-theme')
  if (t === 'light' || t === 'dark') document.documentElement.dataset.theme = t
} catch (e) {}
`

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: APPLY_THEME }} />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  )
}
