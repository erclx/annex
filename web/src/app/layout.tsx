import './globals.css'

import type { Metadata } from 'next'
import { Noto_Sans } from 'next/font/google'

import { AskHandoffProvider } from '@/components/frame/ask-handoff'
import { APPLY_STORED_CHOICES } from '@/lib/browser/stored-choices'

/**
 * Self-hosted at build time rather than left to `--font-sans`'s OS-fallback
 * stack, which a browser resolves to whatever the host happens to have
 * installed. That substitution is not portable: this project's own dev
 * machines resolve the stack to Noto Sans, a GitHub-hosted CI runner resolves
 * it to DejaVu Sans, and the two disagree by a wrapped line on the 34ch and
 * 62ch measures the empty state uses at 400 pixels wide, which is what
 * `web/e2e/replay.spec.ts:111` catches. Pinning the same family the dev
 * machines already substitute keeps the shipped render unchanged.
 */
const notoSans = Noto_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-noto-sans',
  display: 'swap',
})

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

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html
      lang="en"
      className={`h-full antialiased ${notoSans.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: APPLY_STORED_CHOICES }} />
      </head>
      <body className="min-h-full flex flex-col">
        <AskHandoffProvider>{children}</AskHandoffProvider>
      </body>
    </html>
  )
}
