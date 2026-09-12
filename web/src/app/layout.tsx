import './globals.css'

import type { Metadata } from 'next'

const TITLE = 'Annex'
const DESCRIPTION =
  'Describe an AI system in plain language and get back the articles of the EU AI Act you have to read, quoted and located.'

export const metadata: Metadata = {
  metadataBase: new URL('https://annex.erclx.dev'),
  title: TITLE,
  description: DESCRIPTION,
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/icon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/icon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icon-48x48.png', sizes: '48x48', type: 'image/png' },
      { url: '/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/icon-180x180.png', sizes: '180x180', type: 'image/png' }],
  },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    images: [{ url: '/og-image.png', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
    images: ['/og-image.png'],
  },
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
