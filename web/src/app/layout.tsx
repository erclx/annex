import './globals.css'

import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Annex',
  description:
    'Describe an AI system in plain language and get back the articles of the EU AI Act you have to read, quoted and located.',
}

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  )
}
